import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, include: { store: true } });
  if (!product) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title);
  if (body.sku !== undefined) data.sku = String(body.sku);
  if (body.price !== undefined) data.price = String(body.price);
  if (body.stock !== undefined) data.stock = parseInt(String(body.stock), 10);
  if (body.isActive !== undefined) data.isActive = !!body.isActive;
  if (body.description !== undefined) data.description = body.description;
  if (body.compareAtPrice !== undefined) data.compareAtPrice = body.compareAtPrice ? String(body.compareAtPrice) : null;
  const updated = await prisma.product.update({ where: { id }, data: data as never });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
