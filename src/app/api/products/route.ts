import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const provider = searchParams.get("provider");
  const take = Math.min(parseInt(searchParams.get("take") ?? "20", 10), 100);
  const skip = parseInt(searchParams.get("skip") ?? "0", 10);

  const where: Record<string, unknown> = {};
  if (q) {
    (where as Record<string, unknown>).OR = [
      { sku: { contains: q, mode: "insensitive" } },
      { title: { contains: q, mode: "insensitive" } },
    ];
  }
  if (provider) {
    (where as Record<string, unknown>).store = { provider };
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({ where: where as never, take, skip, orderBy: { updatedAt: "desc" }, include: { store: { select: { name: true, provider: true } } } }),
    prisma.product.count({ where: where as never }),
  ]);
  return NextResponse.json({ items, total, take, skip });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { storeId, sku, title, price, stock, description, currency } = body;
  if (!storeId || !sku || !title || price == null) return NextResponse.json({ error: "storeId, sku, title, price requeridos" }, { status: 400 });
  const created = await prisma.product.create({
    data: { storeId, sku: String(sku).trim(), title: String(title).trim(), price: String(price), stock: parseInt(String(stock ?? 0), 10), description: description ?? null, currency: currency ?? "CLP" },
  });
  return NextResponse.json(created, { status: 201 });
}
