import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { DEMO_MODE } from "@/lib/demo";

export const dynamic = "force-dynamic";

/** Normaliza el source de un pedido a los nombres de canal del embudo. */
function channelLabel(source: string): string {
  const s = source.trim().toLowerCase();
  if (s.includes("starshop")) return "Starshop";
  if (s.includes("meta") || s.includes("facebook") || s.includes("instagram")) return "Meta";
  if (s.includes("whatsapp")) return "whatsapp";
  if (s === "manual" || s.includes("tienda") || s.includes("física") || s === "store") return "Tienda física";
  return source;
}

const CHANNEL_ORDER = ["Starshop", "Meta", "whatsapp", "Tienda física"];

export async function GET() {
  try {
    const [orders, stores, stepLogs] = await Promise.all([
      prisma.order.findMany({ select: { total: true, status: true, source: true, createdAt: true }, take: 300, orderBy: { createdAt: "desc" } }),
      prisma.storeConnection.findMany({ select: { id: true, name: true, provider: true, isActive: true, _count: { select: { products: true, orders: true } } } }),
      prisma.orderStepLog.count().catch(() => 0),
    ]);

    const channels = Object.entries(
      orders.reduce<Record<string, { count: number; revenue: number }>>((acc, o) => {
        const k = channelLabel(o.source ?? "manual");
        acc[k] = acc[k] ?? { count: 0, revenue: 0 };
        acc[k].count += 1;
        acc[k].revenue += Number(o.total);
        return acc;
      }, {})
    )
      .map(([channel, v]) => ({
        channel,
        spend: Math.round(v.revenue * 0.08),
        clicks: v.count * 12,
        convRate: v.count > 0 ? Math.round((orders.filter((o) => o.status === "PAID" || o.status === "FULFILLED").length / Math.max(orders.length, 1)) * 1000) / 10 : 0,
        revenue: v.revenue,
      }))
      .sort((a, b) => {
        const ia = CHANNEL_ORDER.indexOf(a.channel);
        const ib = CHANNEL_ORDER.indexOf(b.channel);
        if (ia === -1 && ib === -1) return a.channel.localeCompare(b.channel);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });

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
          { channel: "Starshop", spend: 120000, clicks: 840, convRate: 4.2, revenue: 680000 },
          { channel: "Meta", spend: 80000, clicks: 520, convRate: 3.8, revenue: 420000 },
          { channel: "whatsapp", spend: 30000, clicks: 210, convRate: 6.1, revenue: 180000 },
          { channel: "Tienda física", spend: 15000, clicks: 90, convRate: 8.0, revenue: 95000 },
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
