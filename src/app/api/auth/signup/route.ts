import { NextResponse } from "next/server";
import { hashPassword, createSessionToken, AUTH_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/adapters/prisma";

export async function POST(req: Request) {
  const { email, password, name } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
  if (String(password).length < 8) return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });

  const normalized = String(email).toLowerCase().trim();
  const existing = await prisma.adminUser.findUnique({ where: { email: normalized } }).catch(() => null);
  if (existing) return NextResponse.json({ error: "Ese email ya tiene cuenta. Inicia sesión." }, { status: 409 });

  const count = await prisma.adminUser.count().catch(() => 0);
  const created = await prisma.adminUser.create({
    data: { email: normalized, password: await hashPassword(String(password)), name: name ?? null, role: count === 0 ? "owner" : "member" },
  });
  const token = await createSessionToken(created);
  const res = NextResponse.json({ ok: true, admin: { id: created.id, email: created.email, name: created.name, role: created.role } }, { status: 201 });
  res.cookies.set(AUTH_COOKIE.name, token, AUTH_COOKIE.options);
  return res;
}
