import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/adapters/prisma";

const RESET_SECRET = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET || process.env.AUTH_SECRET || "acs-dev-secret-change-in-prod-32chars");

export async function POST(req: Request) {
  const { token, password } = await req.json().catch(() => ({}));
  if (!token || !password) return NextResponse.json({ error: "Token y nueva contraseña requeridos" }, { status: 400 });
  if (String(password).length < 8) return NextResponse.json({ error: "Mínimo 8 caracteres" }, { status: 400 });
  try {
    const { payload } = await jwtVerify(String(token), RESET_SECRET);
    if (payload.purpose !== "reset" || !payload.sub) return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    await prisma.adminUser.update({ where: { id: payload.sub as string }, data: { password: await hashPassword(String(password)) } });
    return NextResponse.json({ ok: true, message: "Contraseña actualizada. Inicia sesión." });
  } catch {
    return NextResponse.json({ error: "Token expirado o inválido" }, { status: 400 });
  }
}
