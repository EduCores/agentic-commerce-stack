import { NextResponse } from "next/server";
import { hashPassword, createSessionToken, AUTH_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/adapters/prisma";
import { checkAuthRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

export async function POST(req: Request) {
  const rl = checkAuthRateLimit(req, "signup", 5);
  if (!rl.allowed) {
    const { status, headers } = rateLimitResponse(rl.retryAfterSec);
    return NextResponse.json({ error: "Demasiados intentos. Espera un momento." }, { status, headers });
  }
  const { email, password, name } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
  if (String(password).length < 8) return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });

  const normalized = String(email).toLowerCase().trim();
  const existing = await prisma.adminUser.findUnique({ where: { email: normalized } }).catch(() => null);
  if (existing) return NextResponse.json({ error: "Ese email ya tiene cuenta. Inicia sesión." }, { status: 409 });

  // Registro cerrado: solo bootstrap (primer usuario = owner). Miembros los crea un admin en /manage-team.
  const count = await prisma.adminUser.count().catch(() => 0);
  if (count > 0) return NextResponse.json({ error: "El registro está cerrado. Pide acceso a un administrador." }, { status: 403 });

  const created = await prisma.adminUser.create({
    data: { email: normalized, password: await hashPassword(String(password)), name: name ?? null, role: "owner" },
  });
  const token = await createSessionToken(created);
  const res = NextResponse.json({ ok: true, admin: { id: created.id, email: created.email, name: created.name, role: created.role } }, { status: 201 });
  res.cookies.set(AUTH_COOKIE.name, token, AUTH_COOKIE.options);
  return res;
}
