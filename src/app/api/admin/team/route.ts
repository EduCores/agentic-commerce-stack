import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, AUTH_COOKIE, hashPassword } from "@/lib/auth";
import { normalizePhone } from "@/lib/whatsapp";
import { prisma } from "@/lib/adapters/prisma";

export const dynamic = "force-dynamic";

const MEMBER_SELECT = { id: true, email: true, name: true, phone: true, role: true, createdAt: true };

async function requireAdmin() {
  const token = (await cookies()).get(AUTH_COOKIE.name)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const members = await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" }, select: MEMBER_SELECT }).catch(() => []);
  return NextResponse.json({ members });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { email, name, role, password, phone } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: "email y password requeridos" }, { status: 400 });
  const existing = await prisma.adminUser.findUnique({ where: { email: String(email).toLowerCase().trim() } }).catch(() => null);
  if (existing) return NextResponse.json({ error: "Ese email ya es miembro" }, { status: 409 });
  // Teléfono del equipo: se valida y queda activo en WhatsApp al crear
  let normalizedPhone: string | null = null;
  if (phone) {
    normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) return NextResponse.json({ error: "Teléfono inválido (usa formato 569XXXXXXXX)" }, { status: 400 });
  }
  const created = await prisma.adminUser.create({
    data: { email: String(email).toLowerCase().trim(), name: name ?? null, phone: normalizedPhone, role: role ?? "member", password: await hashPassword(String(password)) },
    select: MEMBER_SELECT,
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, role, name, phone } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  // phone:"" lo borra (sale de WhatsApp); phone válido lo agrega/actualiza
  let phonePatch: { phone?: string | null } = {};
  if (phone !== undefined) {
    if (phone === "" || phone === null) phonePatch = { phone: null };
    else {
      const normalized = normalizePhone(phone);
      if (!normalized) return NextResponse.json({ error: "Teléfono inválido (usa formato 569XXXXXXXX)" }, { status: 400 });
      phonePatch = { phone: normalized };
    }
  }
  const updated = await prisma.adminUser.update({ where: { id }, data: { ...(role ? { role } : {}), ...(name !== undefined ? { name } : {}), ...phonePatch }, select: MEMBER_SELECT });
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
