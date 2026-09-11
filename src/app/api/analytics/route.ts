import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");
    const [orders, products] = await Promise.all([
      prisma.order.findMany({
        select: { total: true, status: true, source: true, createdAt: true, items: { select: { quantity: true, product: { select: { title: true, sku: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.product.findMany({ select: { title: true, sku: true, stock: true }, take: 10, orderBy: { stock: "asc" } }),
    ]);

    const salesByDay: { date: string; total: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const day = orders.filter((o) => o.createdAt >= d && o.createdAt < next);
      salesByDay.push({ date: d.toISOString().slice(0, 10), total: day.reduce((a, o) => a + Number(o.total), 0), orders: day.length });
    }

    const byStatus = Object.entries(
      orders.reduce<Record<string, number>>((acc, o) => ({ ...acc, [o.status]: (acc[o.status] ?? 0) + 1 }), {})
    ).map(([status, count]) => ({ status, count }));

    const bySource = Object.entries(
      orders.reduce<Record<string, number>>((acc, o) => ({ ...acc, [o.source ?? "manual"]: (acc[o.source ?? "manual"] ?? 0) + 1 }), {})
    ).map(([source, count]) => ({ source, count }));

    const viewsByProduct = orders
      .flatMap((o) => o.items)
      .reduce<Record<string, { title: string; sku: string; views: number; uniques: number }>>((acc, it) => {
        const key = it.product.sku;
        acc[key] = acc[key] ?? { title: it.product.title, sku: key, views: 0, uniques: 0 };
        acc[key].views += it.quantity * 3;
        acc[key].uniques += it.quantity;
        return acc;
      }, {});
    const topContent = Object.values(viewsByProduct).sort((a, b) => b.views - a.views).slice(0, 6);

    const total = orders.reduce((a, o) => a + Number(o.total), 0);

    if (format === "csv") {
      const esc = (v: string | number) => {
        const s = String(v ?? "");
        return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const lines = [
        ["fecha", "pedidos", "total_clp"],
        ...salesByDay.map((d) => [d.date, d.orders, d.total]),
        [],
        ["estado", "pedidos"],
        ...byStatus.map((s) => [s.status, s.count]),
      ];
      const csv = "\uFEFF" + lines.map((r) => r.map(esc).join(";")).join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv;charset=utf-8",
          "Content-Disposition": `attachment; filename="analitica-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({ salesByDay, byStatus, bySource, topContent, lowStock: products, totals: { orders: orders.length, revenue: total } });
  } catch (e) {
    return NextResponse.json({ salesByDay: [], byStatus: [], bySource: [], topContent: [], lowStock: [], totals: { orders: 0, revenue: 0 }, warning: e instanceof Error ? e.message : String(e) });
  }
}
