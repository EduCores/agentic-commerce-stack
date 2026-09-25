import { NextResponse } from "next/server";
import { getActiveMetaConnection, sendMetaEvents, type MetaEventInput } from "@/lib/adapters/meta";
import { guardChatRequest, corsHeaders } from "@/lib/api/chat-guard";

export const dynamic = "force-dynamic";

const ALLOWED_EVENTS = new Set(["AddToCart", "AddPaymentInfo", "InitiateCheckout", "AddToWishlist", "Purchase", "ViewContent", "Search"]);

/**
 * POST /api/meta/events — Puente Conversions API (pata de escritura).
 * El frontend StarShop envía eventos (Purchase, InitiateCheckout, ...) con
 * event_id para dedup contra el Pixel (mismo eventID en fbq y aquí).
 * Guard: allowlist + rate-limit por IP (misma mecánica que /api/chat).
 * Sin coneón/pixel/token configurados responde ok:false sin romper la tienda.
 */
export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return NextResponse.json({}, { headers: corsHeaders(origin) });
}

export async function POST(req: Request) {
  const guard = guardChatRequest(req, "events");
  if (!guard.allowed) {
    return NextResponse.json({ error: guard.error, retryAfter: guard.retryAfter }, { status: guard.status, headers: guard.headers });
  }

  let body: { events?: MetaEventInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400, headers: guard.headers });
  }
  const events = (body.events ?? []).filter((e) => e && typeof e.event_name === "string" && ALLOWED_EVENTS.has(e.event_name)).slice(0, 10);
  if (events.length === 0) {
    return NextResponse.json({ error: "Sin eventos válidos", allowed: [...ALLOWED_EVENTS] }, { status: 400, headers: guard.headers });
  }

  const conn = await getActiveMetaConnection();
  if (!conn?.isActive || !conn.pixelId) {
    return NextResponse.json({ ok: false, reason: "no_pixel_configured", hint: "Conecta Meta en /marketing y agrega el Pixel ID" }, { status: 200, headers: guard.headers });
  }

  const r = await sendMetaEvents(conn.accessToken.replace(/^("|')|("|')$/g, ""), conn.pixelId, events);
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.error }, { status: 502, headers: guard.headers });
  }
  return NextResponse.json({ ok: true, meta: r.meta }, { headers: guard.headers });
}