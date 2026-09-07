import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const take = Math.min(parseInt(searchParams.get("take") ?? "20", 10), 100);
  const skip = parseInt(searchParams.get("skip") ?? "0", 10);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where: where as never,
      take,
      skip,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { name: true, email: true } },
        store: { select: { name: true, provider: true } },
        items: { include: { product: { select: { sku: true, title: true } } } },
        stepLogs: { take: 5, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.order.count({ where: where as never }),
  ]);

  // Para selects híbridos
  const statuses = ["PENDING", "RESERVED", "PAID", "FULFILLED", "CANCELLED", "REFUNDED", "FAILED"];

  return NextResponse.json({ items, total, take, skip, statuses });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { storeId, customerId, items, subtotal, total, currency } = body;
  if (!storeId || !items?.length || subtotal == null || total == null) {
    return NextResponse.json({ error: "storeId, items, subtotal, total requeridos" }, { status: 400 });
  }
  const order = await prisma.order.create({
    data: {
      storeId,
      customerId: customerId ?? null,
      subtotal: String(subtotal),
      total: String(total),
      currency: currency ?? "CLP",
      items: {
        create: (items as Array<{ productId: string; quantity: number; price: string | number; total: string | number }>).map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          price: String(it.price),
          total: String(it.total),
        })),
      },
    },
    include: { items: true },
  });
  return NextResponse.json(order, { status: 201 });
}
