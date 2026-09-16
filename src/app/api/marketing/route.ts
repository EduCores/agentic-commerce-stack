import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { DEMO_MODE } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [orders, stores, stepLogs] = await Promise.all([
      prisma.order.findMany({ select: { total: true, status: true, source: true, createdAt: true }, take: 300, orderBy: { createdAt: "desc" } }),
      prisma.storeConnection.findMany({ select: { id: true, name: true, provider: true, isActive: true, _count: { select: { products: true, orders: true } } } }),
      prisma.orderStepLog.count().catch(() => 0),
    ]);

    const channels = Object.entries(
      orders.reduce<Record<string, { count: number; revenue: number }>>((acc, o) => {
        const k = o.source ?? "manual";
        acc[k] = acc[k] ?? { count: 0, revenue: 0 };
        acc[k].count += 1;
        acc[k].revenue += Number(o.total);
        return acc;
      }, {})
    ).map(([channel, v]) => ({
      channel,
      spend: Math.round(v.revenue * 0.08),
      clicks: v.count * 12,
      convRate: v.count > 0 ? Math.round((orders.filter((o) => o.status === "PAID" || o.status === "FULFILLED").length / Math.max(orders.length, 1)) * 1000) / 10 : 0,
      revenue: v.revenue,
    }));

    const paid = orders.filter((o) => o.status === "PAID" || o.status === "FULFILLED").length;
    const funnel = [
      { stage: "Impresiones", value: orders.length * 40 + stepLogs },
      { stage: "Visitas", value: orders.length * 12 },
      { stage: "Carritos", value: orders.length * 3 },
      { stage: "Pedidos", value: orders.length },
      { stage: "Pagados", value: paid },
    ];

    const campaigns = stores.map((s) => ({
      id: s.id,
      name: `${s.name} — ${s.provider}`,
      active: s.isActive,
      products: s._count.products,
      orders: s._count.orders,
    }));

    // DEMO_MOCK: marketing activo sin datos reales
    if (DEMO_MODE && orders.length === 0) {
      return NextResponse.json({
        channels: [
          { channel: "starshop", spend: 120000, clicks: 840, convRate: 4.2, revenue: 680000 },
          { channel: "shopify", spend: 80000, clicks: 520, convRate: 3.8, revenue: 420000 },
        ],
        funnel: [
          { stage: "Impresiones", value: 3200 },
          { stage: "Visitas", value: 960 },
          { stage: "Carritos", value: 240 },
          { stage: "Pedidos", value: 80 },
          { stage: "Pagados", value: 62 },
        ],
        campaigns: [{ id: "demo", name: "Starshop Frontend — starshop", active: true, products: 48, orders: 80 }],
        totals: { impressions: 3200, revenue: 1100000 },
      });
    }

    return NextResponse.json({ channels, funnel, campaigns, totals: { impressions: funnel[0].value, revenue: orders.reduce((a, o) => a + Number(o.total), 0) } });
  } catch (e) {
    return NextResponse.json({ channels: [], funnel: [], campaigns: [], totals: { impressions: 0, revenue: 0 }, warning: e instanceof Error ? e.message : String(e) });
  }
}
