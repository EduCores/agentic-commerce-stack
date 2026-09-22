import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { DEMO_MODE } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");
    // Rango del gráfico de visitas/ventas: 7 | 14 | 21 | 28 días.
    const rawDays = Number(searchParams.get("days"));
    const days = [7, 14, 21, 28].includes(rawDays) ? rawDays : 7;
    const [orders, products] = await Promise.all([
      prisma.order.findMany({
        select: { total: true, status: true, source: true, createdAt: true, items: { select: { quantity: true, product: { select: { title: true, sku: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.product.findMany({ select: { title: true, sku: true, stock: true }, take: 10, orderBy: { stock: "asc" } }),
    ]);

    const salesByDay: { date: string; total: number; orders: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
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

    // DEMO_MOCK: analítica activa sin datos reales
    if (DEMO_MODE && orders.length === 0) {
      const baseTotal = [80000, 120000, 95000, 210000, 180000, 250000, 310000];
      const baseOrders = [2, 4, 3, 6, 5, 8, 7];
      const mockSalesByDay = Array.from({ length: days }).map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
        return { date: d.toISOString().slice(0, 10), total: baseTotal[i % baseTotal.length], orders: baseOrders[i % baseOrders.length] };
      });
      return NextResponse.json({
        salesByDay: mockSalesByDay,
        byStatus: [{ status: "PAID", count: 42 }, { status: "PENDING", count: 7 }, { status: "FULFILLED", count: 31 }],
        bySource: [{ source: "starshop", count: 58 }, { source: "shopify", count: 22 }],
        topContent: [
          { sku: "TAL-20V-01", title: "Taladro percutor 20V", views: 342, uniques: 98 },
          { sku: "LED-36W-03", title: "Panel LED 36W", views: 298, uniques: 87 },
        ],
        lowStock: [{ title: "Sierra circular 7-1/4", sku: "SIE-714-02", stock: 3 }, { title: "Taladro percutor 20V", sku: "TAL-20V-01", stock: 5 }],
        totals: { orders: 80, revenue: 1240000 },
      });
    }

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
