import { NextResponse } from "next/server";
import { getMetaPixelId } from "@/lib/adapters/meta";
import { corsHeaders, isOriginAllowed } from "@/lib/api/chat-guard";

export const dynamic = "force-dynamic";

const ORIGIN_HEADER = "Access-Control-Allow-Origin";

/**
 * GET /api/meta/pixel — Pixel ID público para el frontend StarShop.
 * El pixel no es secreto: se inyecta en el navegador de todos modos.
 * Guard: allowlist de orígenes (la misma que usa /api/chat).
 */
export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  if (origin && !isOriginAllowed(origin)) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403, headers });
  }
  const pixelId = await getMetaPixelId();
  return NextResponse.json({ ok: true, pixelId: pixelId ?? null, time: new Date().toISOString() }, { headers: { ...headers, [ORIGIN_HEADER]: origin || "*" } });
}