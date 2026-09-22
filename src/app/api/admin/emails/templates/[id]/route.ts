import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { BUILTIN_TEMPLATE_KEYS } from "@/lib/emails/templates";
import { requireAdmin } from "@/lib/emails/admin-guard";

export const dynamic = "force-dynamic";

/** Actualiza una plantilla (solo admin). La key no se cambia. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const existing = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });

  const data: Record<string, unknown> = {};
  for (const f of ["name", "description", "subject", "preheader", "headerTitle", "body", "buttonText", "buttonUrl"] as const) {
    if (typeof b[f] === "string") data[f] = b[f];
  }
  if (typeof b.isActive === "boolean") data.isActive = b.isActive;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

  const updated = await prisma.emailTemplate.update({ where: { id }, data: data as never });
  return NextResponse.json({ template: updated });
}

/** Elimina una plantilla propia (solo admin). Las del sistema no se eliminan: se desactivan. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
  if ((BUILTIN_TEMPLATE_KEYS as readonly string[]).includes(existing.key)) {
    return NextResponse.json(
      { error: "Las plantillas del sistema no se eliminan: desactívalas con el interruptor." },
      { status: 400 }
    );
  }
  await prisma.emailTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
