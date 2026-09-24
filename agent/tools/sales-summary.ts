import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";
import { prisma } from "@/lib/adapters/prisma";
import { resolveProductImage } from "@/utils/product-image";
import type { Prisma } from "../../src/generated/prisma/client";

/**
 * Resumen REAL de ventas para el dueño (admin_ops): hoy, ayer o fecha exacta.
 * Lee Prisma directo: ingresos y pedidos pagados/completados del día pedido,
 * top 3 productos por unidades con sus ingresos, y stock total/reservado.
 * Nunca inventa cifras: si no hay movimientos, devuelve ceros y listas vacías.
 */
export default defineTool({
  description:
    "Resumen real de ventas (ingresos CLP, pedidos pagados/completados, top 3 productos, stock total y reservado) de HOY por defecto. Acepta period=yesterday para ayer o date=AAAA-MM-DD para un día exacto. Úsala SIEMPRE antes de responder preguntas del dueño sobre ventas/ingresos/cómo van las ventas, eligiendo el período que pide. SOLO para admin_ops.",
  inputSchema: z.object({
    period: z.enum(["today", "yesterday"]).optional().default("today"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "date debe ser AAAA-MM-DD")
      .optional(),
  }),
  async execute({ period, date }) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (date) {
      const [y, m, d] = date.split("-").map(Number);
      start.setFullYear(y, m - 1, d);
    } else if ((period ?? "today") === "yesterday") {
      start.setDate(start.getDate() - 1);
    }
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const label = date ?? ((period ?? "today") === "yesterday" ? "ayer" : "hoy");
    const paidFilter: Prisma.OrderWhereInput = { status: { in: ["PAID", "FULFILLED"] }, createdAt: { gte: start, lt: end } };

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
      const imgs = Array.isArray(m?.images) ? m.images : [];
      return {
        title: m?.title ?? "Producto",
        sku: m?.sku ?? g.productId.slice(0, 8),
        quantity: g._sum.quantity ?? 0,
        revenue: Math.round(Number(g._sum.total ?? 0)),
        price: m?.price != null ? Math.round(Number(m.price)) : 0,
        image: resolveProductImage(imgs),
      };
    });

    return {
      date: start.toISOString().slice(0, 10),
      label,
      revenue: Math.round(Number(revenueAgg._sum.total ?? 0)),
      orders: ordersCount,
      topProducts,
      totalStock: stockAgg._sum.stock ?? 0,
      reservedStock: stockAgg._sum.reservedStock ?? 0,
    };
  },
});
