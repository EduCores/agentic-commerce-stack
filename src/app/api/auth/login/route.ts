import { NextResponse } from "next/server";
import { getAdminByEmail, verifyPassword, createSessionToken, AUTH_COOKIE, ensureDefaultAdmin } from "@/lib/auth";
import { prisma } from "@/lib/adapters/prisma";
import { checkAuthRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

export async function POST(req: Request) {
  const rl = checkAuthRateLimit(req, "login", 10);
  if (!rl.allowed) {
    const { status, headers } = rateLimitResponse(rl.retryAfterSec);
    return NextResponse.json({ error: "Demasiados intentos. Espera un momento." }, { status, headers });
  }
  const { email, password, code } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });

  // Asegura admin por defecto si DB está vacía (primer arranque)
  await ensureDefaultAdmin().catch(() => {});

  let admin = null;
  try {
    admin = await getAdminByEmail(email);
  } catch (e) {
    console.error("[login] DB no disponible:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Servicio no disponible. Inténtalo de nuevo." }, { status: 503 });
  }
  if (!admin) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

  const ok = await verifyPassword(password, admin.password);
  if (!ok) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

  // 2FA activado en el perfil: exige código vigente antes de crear sesión
  const profile = (admin.profileData ?? {}) as { twoFactorEnabled?: boolean };
  if (profile.twoFactorEnabled === true) {
    if (!code) return NextResponse.json({ ok: false, require2fa: true, message: "Tu cuenta exige verificación en dos pasos." }, { status: 200 });
    const entry = await prisma.verificationCode.findFirst({
      where: { email: admin.email, purpose: "2fa", consumedAt: null },
      orderBy: { createdAt: "desc" },
    }).catch(() => null);
    if (!entry || entry.expiresAt < new Date()) return NextResponse.json({ error: "Código expirado. Pide uno nuevo." }, { status: 401 });
    if (entry.code !== String(code).trim()) return NextResponse.json({ error: "Código incorrecto." }, { status: 401 });
    await prisma.verificationCode.update({ where: { id: entry.id }, data: { consumedAt: new Date() } }).catch(() => {});
  }

  const token = await createSessionToken(admin);
  const res = NextResponse.json({ ok: true, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
  res.cookies.set(AUTH_COOKIE.name, token, AUTH_COOKIE.options);
  return res;
}
