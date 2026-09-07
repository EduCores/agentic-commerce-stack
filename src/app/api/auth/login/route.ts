import { NextResponse } from "next/server";
import { getAdminByEmail, verifyPassword, createSessionToken, AUTH_COOKIE, ensureDefaultAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });

  // Asegura admin por defecto si DB está vacía (primer arranque)
  await ensureDefaultAdmin().catch(() => {});

  const admin = await getAdminByEmail(email);
  if (!admin) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

  const ok = await verifyPassword(password, admin.password);
  if (!ok) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

  const token = await createSessionToken(admin);
  const res = NextResponse.json({ ok: true, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
  res.cookies.set(AUTH_COOKIE.name, token, AUTH_COOKIE.options);
  return res;
}
