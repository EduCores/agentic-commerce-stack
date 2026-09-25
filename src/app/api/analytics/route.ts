import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { DEMO_MODE } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");
    const rawDays = Number(searchParams.get("days"));
    const days = [7, 14, 21, 28].includes(rawDays) ? rawDays : 21;
    const rawMonth = Number(searchParams.get("month"));
    const rawYear = Number(searchParams.get("year"));
    const month = rawMonth >= 1 && rawMonth <= 12 ? rawMonth : null;
    const year = rawYear >= 2020 && rawYear <= 2035 ? rawYear : null;
    const [orders, products] = await Promise.all([
      prisma.order.findMany({
        select: { total: true, status: true, source: true, createdAt: true, items: { select: { quantity: true, product: { select: { title: true, sku: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.product.findMany({ select: { title: true, sku: true, stock: true }, take: 10, orderBy: { stock: "asc" } }),
    ]);

    // Rango: Mes/Año si se filtró (pisa los últimos N días), si no últimos N días
    const sumDay = (day: typeof orders) => day.reduce((a, o) => a + Number(o.total), 0);
    const salesByDay: { date: string; total: number; orders: number }[] = [];
    if (month && year) {
      const dim = new Date(year, month, 0).getDate();
      for (let d = 1; d <= dim; d++) {
        const start = new Date(year, month - 1, d, 0, 0, 0, 0);
        const next = new Date(year, month - 1, d + 1, 0, 0, 0, 0);
        const day = orders.filter((o) => o.createdAt >= start && o.createdAt < next);
        salesByDay.push({ date: start.toISOString().slice(0, 10), total: sumDay(day), orders: day.length });
      }
    } else if (year && !month) {
      for (let m = 0; m < 12; m++) {
        const start = new Date(year, m, 1, 0, 0, 0, 0);
        const next = new Date(year, m + 1, 1, 0, 0, 0, 0);
        const day = orders.filter((o) => o.createdAt >= start && o.createdAt < next);
        salesByDay.push({ date: start.toISOString().slice(0, 7), total: sumDay(day), orders: day.length });
      }
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        const day = orders.filter((o) => o.createdAt >= d && o.createdAt < next);
        salesByDay.push({ date: d.toISOString().slice(0, 10), total: sumDay(day), orders: day.length });
      }
    }

    const byStatusMap = orders.reduce<Record<string, { count: number; revenue: number }>>((acc, o) => {
      const k = o.status;
      acc[k] = acc[k] ?? { count: 0, revenue: 0 };
      acc[k].count += 1;
      acc[k].revenue += Number(o.total);
      return acc;
    }, {});
    const byStatus = Object.entries(byStatusMap).map(([status, v]) => ({
      status,
      count: v.count,
      revenue: Math.round(v.revenue),
    }));

    const bySourceMap = orders.reduce<Record<string, { count: number; revenue: number }>>((acc, o) => {
      const k = o.source ?? "manual";
      acc[k] = acc[k] ?? { count: 0, revenue: 0 };
      acc[k].count += 1;
      acc[k].revenue += Number(o.total);
      return acc;
    }, {});
    const bySource = Object.entries(bySourceMap).map(([source, v]) => ({
      source,
      count: v.count,
      revenue: Math.round(v.revenue),
    }));

    const viewsByProduct = orders
      .flatMap((o) => o.items)
      .reduce<Record<string, { title: string; sku: string; views: number; uniques: number; revenue: number }>>((acc, it) => {
        const key = it.product.sku;
        acc[key] = acc[key] ?? { title: it.product.title, sku: key, views: 0, uniques: 0, revenue: 0 };
        acc[key].views += it.quantity * 3;
        acc[key].uniques += it.quantity;
        return acc;
      }, {});
    // Ingresos por producto = suma del total de pedidos que lo incluyen
    for (const o of orders) {
      for (const it of o.items) {
        if (viewsByProduct[it.product.sku]) viewsByProduct[it.product.sku].revenue += Number(o.total);
      }
    }
    const topContent = Object.values(viewsByProduct).sort((a, b) => b.views - a.views).slice(0, 6);

    const total = orders.reduce((a, o) => a + Number(o.total), 0);
    const paidCount = orders.filter((o) => ["PAID", "FULFILLED"].includes(o.status)).length;
    const avgOrder = orders.length ? Math.round(total / orders.length) : 0;
    const conversion = orders.length ? Math.round((paidCount / orders.length) * 1000) / 10 : 0;
    const bestDay = salesByDay.reduce<{ date: string; total: number; orders: number } | null>(
      (b, d) => (b && b.total >= d.total ? b : d),
      null
    );
    const prev = (n: number) => (salesByDay.length > n ? Math.max(0, salesByDay.reduce((a, d, i) => (i < salesByDay.length - n ? a + d.total : a), 0)) : 0);
    const lastPeriod = salesByDay.reduce((a, d) => a + d.total, 0);
    const growth = salesByDay.length >= 2 ? Math.round(((lastPeriod - prev(1)) / Math.max(1, prev(1))) * 100) : 0;

    // DEMO_MOCK: analítica activa sin datos reales
    if (DEMO_MODE && orders.length === 0) {
      const baseTotal = [80000, 120000, 95000, 210000, 180000, 250000, 310000];
      const baseOrders = [2, 4, 3, 6, 5, 8, 7];
      const mockSalesByDay =
        month && year
          ? Array.from({ length: new Date(year, month, 0).getDate() }).map((_, i) => {
              const d = new Date(year, month - 1, i + 1);
              return { date: d.toISOString().slice(0, 10), total: baseTotal[i % baseTotal.length], orders: baseOrders[i % baseOrders.length] };
            })
          : year && !month
            ? Array.from({ length: 12 }).map((_, i) => {
                const d = new Date(year, i, 1);
                return { date: d.toISOString().slice(0, 7), total: baseTotal[i % baseTotal.length] * 3, orders: baseOrders[i % baseOrders.length] * 3 };
              })
            : Array.from({ length: days }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (days - 1 - i));
                return { date: d.toISOString().slice(0, 10), total: baseTotal[i % baseTotal.length], orders: baseOrders[i % baseOrders.length] };
              });
      const mockTotal = mockSalesByDay.reduce((a, d) => a + d.total, 0);
      return NextResponse.json({
        salesByDay: mockSalesByDay,
        byStatus: [
          { status: "PAID", count: 42, revenue: 700000 },
          { status: "PENDING", count: 7, revenue: 60000 },
          { status: "FULFILLED", count: 31, revenue: 480000 },
        ],
        bySource: [
          { source: "starshop", count: 58, revenue: 900000 },
          { source: "shopify", count: 22, revenue: 340000 },
        ],
        topContent: [
          { sku: "TAL-20V-01", title: "Taladro percutor 20V", views: 342, uniques: 98, revenue: 520000 },
          { sku: "LED-36W-03", title: "Panel LED 36W", views: 298, uniques: 87, revenue: 410000 },
          { sku: "SIE-714-02", title: "Sierra circular 7-1/4", views: 251, uniques: 64, revenue: 370000 },
        ],
        lowStock: [{ title: "Sierra circular 7-1/4", sku: "SIE-714-02", stock: 3 }, { title: "Taladro percutor 20V", sku: "TAL-20V-01", stock: 5 }],
        totals: { orders: 80, revenue: 1240000, avgOrder: 15500, conversion: 91.3, bestDay: mockSalesByDay[6] ?? null, growth: 18 },
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

    return NextResponse.json({ salesByDay, byStatus, bySource, topContent, lowStock: products, totals: { orders: orders.length, revenue: total, avgOrder, conversion, bestDay, growth } });
  } catch (e) {
    return NextResponse.json({ salesByDay: [], byStatus: [], bySource: [], topContent: [], lowStock: [], totals: { orders: 0, revenue: 0, avgOrder: 0, conversion: 0, bestDay: null, growth: 0 }, warning: e instanceof Error ? e.message : String(e) });
  }
}
