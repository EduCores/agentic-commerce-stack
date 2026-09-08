import { NextResponse } from "next/server";
import { createSessionToken, AUTH_COOKIE, getAdminByEmail } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, code } = await req.json().catch(() => ({}));
  if (!email || !code) return NextResponse.json({ error: "Email y código requeridos" }, { status: 400 });
  const normalized = String(email).toLowerCase().trim();
  const store = (globalThis as unknown as { __acs2fa?: Map<string, { code: string; exp: number }> }).__acs2fa;
  const entry = store?.get(normalized);
  if (!entry || entry.exp < Date.now()) return NextResponse.json({ error: "Código expirado. Pide uno nuevo." }, { status: 400 });
  if (entry.code !== String(code).trim()) return NextResponse.json({ error: "Código incorrecto" }, { status: 400 });
  store?.delete(normalized);
  const admin = await getAdminByEmail(normalized);
  if (!admin) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  const token = await createSessionToken(admin);
  const res = NextResponse.json({ ok: true, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
  res.cookies.set(AUTH_COOKIE.name, token, AUTH_COOKIE.options);
  return res;
}
