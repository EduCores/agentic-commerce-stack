import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";
import { prisma } from "@/lib/adapters/prisma";
import type { Prisma } from "../../src/generated/prisma/client";

/**
 * Resumen REAL de ventas de hoy para el dueño (admin_ops).
 * Lee Prisma directo: ingresos y pedidos pagados/completados de hoy,
 * top 3 productos por unidades con sus ingresos, y stock total/reservado.
 * Nunca inventa cifras: si no hay movimientos, devuelve ceros y listas vacías.
 */
export default defineTool({
  description:
    "Resumen real de ventas de HOY (ingresos CLP, pedidos pagados/completados, top 3 productos, stock total y reservado). Úsala SIEMPRE antes de responder preguntas del dueño sobre ventas/ingresos/cómo van las ventas. SOLO para admin_ops.",
  inputSchema: z.object({}),
  async execute() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const paidFilter: Prisma.OrderWhereInput = { status: { in: ["PAID", "FULFILLED"] }, createdAt: { gte: start } };

    const [revenueAgg, ordersCount, topGroups, stockAgg] = await Promise.all([
      prisma.order.aggregate({ _sum: { total: true }, where: { ...paidFilter } }).catch(() => ({ _sum: { total: null } })),
      prisma.order.count({ where: { ...paidFilter } }).catch(() => 0),
      prisma.orderItem
        .groupBy({
          by: ["productId"],
          _sum: { quantity: true, total: true },
          where: { order: { ...paidFilter } },
          orderBy: { _sum: { quantity: "desc" } },
          take: 3,
        })
        .catch(() => []),
      prisma.product.aggregate({ _sum: { stock: true, reservedStock: true } }).catch(() => ({ _sum: { stock: 0, reservedStock: 0 } })),
    ]);

    const ids = topGroups.map((g) => g.productId);
    const metas = ids.length
      ? await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, sku: true, price: true, images: true } }).catch(() => [])
      : [];
    const topProducts = topGroups.map((g) => {
      const m = metas.find((x) => x.id === g.productId);
      const imgs = Array.isArray(m?.images) ? (m.images as unknown[]).filter((u): u is string => typeof u === "string") : [];
      return {
        title: m?.title ?? "Producto",
        sku: m?.sku ?? g.productId.slice(0, 8),
        quantity: g._sum.quantity ?? 0,
        revenue: Math.round(Number(g._sum.total ?? 0)),
        price: m?.price != null ? Math.round(Number(m.price)) : 0,
        image: imgs[0] ?? "",
      };
    });

    return {
      date: start.toISOString().slice(0, 10),
      revenue: Math.round(Number(revenueAgg._sum.total ?? 0)),
      orders: ordersCount,
      topProducts,
      totalStock: stockAgg._sum.stock ?? 0,
      reservedStock: stockAgg._sum.reservedStock ?? 0,
    };
  },
});
