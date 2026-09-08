import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

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

    return NextResponse.json({ channels, funnel, campaigns, totals: { impressions: funnel[0].value, revenue: orders.reduce((a, o) => a + Number(o.total), 0) } });
  } catch (e) {
    return NextResponse.json({ channels: [], funnel: [], campaigns: [], totals: { impressions: 0, revenue: 0 }, warning: e instanceof Error ? e.message : String(e) });
  }
}
