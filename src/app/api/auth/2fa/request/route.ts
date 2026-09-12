import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/adapters/prisma";
import { checkAuthRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  const normalized = String(email).toLowerCase().trim();
  const rl = checkAuthRateLimit(req, "2fa-request", 5, normalized);
  if (!rl.allowed) {
    const { status, headers } = rateLimitResponse(rl.retryAfterSec);
    return NextResponse.json({ error: "Demasiados intentos. Espera un momento." }, { status, headers });
  }
  const user = await prisma.adminUser.findUnique({ where: { email: normalized } }).catch(() => null);
  // Respuesta genérica para no enumerar cuentas (se envía correo solo si existe)
  if (!user) return NextResponse.json({ ok: true, message: "Si existe la cuenta, enviamos el código." });
  const code = String(randomInt(100000, 1000000));
  // Invalida códigos previos y guarda el nuevo (5 min). Limpia expirados de paso.
  await prisma.verificationCode.updateMany({ where: { email: normalized, purpose: "2fa", consumedAt: null }, data: { consumedAt: new Date() } }).catch(() => {});
  await prisma.verificationCode.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
  await prisma.verificationCode.create({ data: { email: normalized, code, purpose: "2fa", expiresAt: new Date(Date.now() + 5 * 60 * 1000) } });
  const { default: sendEmail } = await import("@/../agent/tools/send-email");
  await sendEmail.execute({ to: normalized, subject: "Tu código StarShop", template: "general", text: `Tu código de verificación (5 min): ${code}` } as never).catch(() => {});
  const isDev = process.env.NODE_ENV !== "production";
  return NextResponse.json({ ok: true, message: "Código enviado al correo.", ...(isDev ? { debugCode: code } : {}) });
}
