import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

export const dynamic = "force-dynamic";

function toInt(v: unknown, fallback?: number) {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? Math.trunc(n as number) : fallback;
}

// PUT /api/slider/:id — actualiza slide local (edición, publicar/ocultar, reordenar)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const slideId = Number(id);
    if (!Number.isInteger(slideId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = String(body.title).slice(0, 120);
    if (body.subtitle !== undefined) data.subtitle = String(body.subtitle).slice(0, 160);
    if (body.description !== undefined) data.description = String(body.description).slice(0, 300);
    if (body.cta !== undefined) data.cta = String(body.cta).slice(0, 40);
    if (body.image !== undefined) data.image = String(body.image).slice(0, 2_000_000);
    if (body.bg !== undefined) data.bg = String(body.bg).slice(0, 120);
    if (body.badge !== undefined) data.badge = String(body.badge).slice(0, 60);
    const sortOrder = body.sortOrder !== undefined ? toInt(body.sortOrder) : undefined;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (body.active !== undefined) data.active = body.active === true;
    const updated = await prisma.heroSlide.update({ where: { id: slideId }, data: data as never });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error actualizando slide" },
      { status: 500 },
    );
  }
}

// DELETE /api/slider/:id — elimina slide local
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const slideId = Number(id);
    if (!Number.isInteger(slideId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    await prisma.heroSlide.delete({ where: { id: slideId } });
    return NextResponse.json({ ok: true, id: slideId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error eliminando slide" },
      { status: 500 },
    );
  }
}
