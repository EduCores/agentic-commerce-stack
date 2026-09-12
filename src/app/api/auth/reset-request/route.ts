import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/adapters/prisma";
import { getJwtSecret } from "@/lib/jwt-secret";
import { checkAuthRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

const RESET_SECRET = getJwtSecret();

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  const normalized = String(email).toLowerCase().trim();
  const rl = checkAuthRateLimit(req, "reset-request", 5, normalized);
  if (!rl.allowed) {
    const { status, headers } = rateLimitResponse(rl.retryAfterSec);
    return NextResponse.json({ error: "Demasiados intentos. Espera un momento." }, { status, headers });
  }
  const user = await prisma.adminUser.findUnique({ where: { email: normalized } }).catch(() => null);
  // Respuesta genérica para no filtrar emails existentes
  if (!user) return NextResponse.json({ ok: true, message: "Si existe la cuenta, enviamos instrucciones." });
  const token = await new SignJWT({ purpose: "reset", email: normalized })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(RESET_SECRET);
  const { default: sendEmail } = await import("@/../agent/tools/send-email");
  await sendEmail.execute({ to: normalized, subject: "Recupera tu acceso StarShop", template: "general", text: `Usa este código para restablecer (15 min): ${token}` } as never).catch(() => {});
  const isDev = process.env.NODE_ENV !== "production";
  return NextResponse.json({ ok: true, message: "Si existe la cuenta, enviamos instrucciones.", ...(isDev ? { debugToken: token } : {}) });
}
