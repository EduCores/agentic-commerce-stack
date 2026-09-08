import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, AUTH_COOKIE, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/adapters/prisma";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const token = (await cookies()).get(AUTH_COOKIE.name)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const members = await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, email: true, name: true, role: true, createdAt: true } }).catch(() => []);
  return NextResponse.json({ members });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { email, name, role, password } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: "email y password requeridos" }, { status: 400 });
  const existing = await prisma.adminUser.findUnique({ where: { email: String(email).toLowerCase().trim() } }).catch(() => null);
  if (existing) return NextResponse.json({ error: "Ese email ya es miembro" }, { status: 409 });
  const created = await prisma.adminUser.create({
    data: { email: String(email).toLowerCase().trim(), name: name ?? null, role: role ?? "member", password: await hashPassword(String(password)) },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, role, name } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const updated = await prisma.adminUser.update({ where: { id }, data: { ...(role ? { role } : {}), ...(name !== undefined ? { name } : {}) }, select: { id: true, email: true, name: true, role: true, createdAt: true } });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const count = await prisma.adminUser.count().catch(() => 1);
  if (count <= 1) return NextResponse.json({ error: "No puedes eliminar al último miembro" }, { status: 400 });
  await prisma.adminUser.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
