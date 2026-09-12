import { NextResponse } from "next/server";
import { createSessionToken, AUTH_COOKIE, getAdminByEmail } from "@/lib/auth";
import { prisma } from "@/lib/adapters/prisma";
import { checkAuthRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

export async function POST(req: Request) {
  const { email, code } = await req.json().catch(() => ({}));
  if (!email || !code) return NextResponse.json({ error: "Email y código requeridos" }, { status: 400 });
  const normalized = String(email).toLowerCase().trim();
  // Límite de intentos: frena fuerza bruta del código de 6 dígitos
  const rl = checkAuthRateLimit(req, "2fa-verify", 12, normalized);
  if (!rl.allowed) {
    const { status, headers } = rateLimitResponse(rl.retryAfterSec);
    return NextResponse.json({ error: "Demasiados intentos. Pide un código nuevo en unos minutos." }, { status, headers });
  }
  const entry = await prisma.verificationCode.findFirst({
    where: { email: normalized, purpose: "2fa", consumedAt: null },
    orderBy: { createdAt: "desc" },
  }).catch(() => null);
  if (!entry || entry.expiresAt < new Date()) return NextResponse.json({ error: "Código expirado. Pide uno nuevo." }, { status: 400 });
  if (entry.code !== String(code).trim()) return NextResponse.json({ error: "Código incorrecto" }, { status: 400 });
  await prisma.verificationCode.update({ where: { id: entry.id }, data: { consumedAt: new Date() } }).catch(() => {});
  const admin = await getAdminByEmail(normalized);
  if (!admin) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  const token = await createSessionToken(admin);
  const res = NextResponse.json({ ok: true, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
  res.cookies.set(AUTH_COOKIE.name, token, AUTH_COOKIE.options);
  return res;
}
