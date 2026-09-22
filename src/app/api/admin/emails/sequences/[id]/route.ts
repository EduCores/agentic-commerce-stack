import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { parseSteps } from "@/lib/emails/processor";
import { requireAdmin } from "@/lib/emails/admin-guard";

export const dynamic = "force-dynamic";

/** Actualiza una secuencia (solo admin). */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.emailSequence.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Secuencia no encontrada" }, { status: 404 });
  const b = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof b.name === "string" && b.name.trim()) data.name = b.name.slice(0, 80);
  if (typeof b.description === "string" || b.description === null) data.description = b.description;
  if (typeof b.isActive === "boolean") data.isActive = b.isActive;
  if (b.steps !== undefined) {
    const steps = parseSteps(b.steps);
    if (steps.length === 0) return NextResponse.json({ error: "La secuencia necesita al menos 1 paso válido" }, { status: 400 });
    const keys = [...new Set(steps.map((s) => s.templateKey))];
    const found = await prisma.emailTemplate.findMany({ where: { key: { in: keys }, isActive: true }, select: { key: true } });
    const missing = keys.filter((k) => !found.some((f) => f.key === k));
    if (missing.length > 0) {
      return NextResponse.json({ error: `Plantillas no encontradas o inactivas: ${missing.join(", ")}` }, { status: 400 });
    }
    data.steps = steps;
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

  const updated = await prisma.emailSequence.update({ where: { id }, data: data as never });
  return NextResponse.json({ sequence: updated });
}

/** Elimina una secuencia y sus inscripciones (solo admin). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.emailSequence.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Secuencia no encontrada" }, { status: 404 });
  await prisma.emailSequence.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
