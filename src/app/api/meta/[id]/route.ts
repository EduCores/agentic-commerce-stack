import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { requireAdmin } from "@/lib/emails/admin-guard";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.metaConnection.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  await prisma.metaConnection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 80);
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.pixelId === "string") data.pixelId = body.pixelId.trim() || null;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  const updated = await prisma.metaConnection.update({ where: { id }, data: data as never });
  return NextResponse.json({ ok: true, connection: { id: updated.id, name: updated.name } });
}
