import { NextResponse } from "next/server";
import { checkAuthRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { reportError } from "@/lib/error-events";

export const dynamic = "force-dynamic";

/**
 * POST /api/errors/report — reporta errores del navegador (global-error.tsx).
 * Rate-limit 20/min por IP (endpoint sin sesión por diseño: el cliente roto
 * puede estar sin sesión). Solo acepta kind=client; el servidor clasifica
 * lo demás con reportError() directo.
 */
export async function POST(req: Request) {
  const rl = checkAuthRateLimit(req, "errors-report", 20);
  if (!rl.allowed) {
    const { status, headers } = rateLimitResponse(rl.retryAfterSec);
    return NextResponse.json({ error: "Demasiados reportes. Espera un momento." }, { status, headers });
  }
  const { message, stack } = (await req.json().catch(() => ({}))) as { message?: string; stack?: string };
  if (!message || typeof message !== "string") return NextResponse.json({ error: "message requerido" }, { status: 400 });
  const r = await reportError({ kind: "client", message: message.slice(0, 1000), stack: typeof stack === "string" ? stack.slice(0, 4000) : undefined });
  return NextResponse.json({ ok: true, fingerprint: r?.fingerprint ?? null });
}
