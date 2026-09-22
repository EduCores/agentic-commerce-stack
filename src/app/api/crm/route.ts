import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { DEMO_MODE } from "@/lib/demo";

export const dynamic = "force-dynamic";

const ORDER_STATUS_ES: Record<string, string> = {
  PENDING: "Pendiente",
  RESERVED: "Reservado",
  PAID: "Pagado",
  FULFILLED: "Completado",
  CANCELLED: "Cancelado",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
};

const RUN_STATUS_ES: Record<string, string> = {
  PENDING: "Pendiente",
  RUNNING: "En curso",
  COMPLETED: "Completado",
  FAILED: "Fallido",
  WAITING_APPROVAL: "Esperando aprobación",
  CANCELLED: "Cancelado",
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawDays = Number(url.searchParams.get("days"));
    const days = [7, 14, 21, 28].includes(rawDays) ? rawDays : 7;
    const rawMonth = Number(url.searchParams.get("month"));
    const rawYear = Number(url.searchParams.get("year"));
    const month = rawMonth >= 1 && rawMonth <= 12 ? rawMonth : null;
    const year = rawYear >= 2020 && rawYear <= 2035 ? rawYear : null;
    const [customers, orders, pendingRuns, activities, stepLogs, orderStats, customerDates] = await Promise.all([
      prisma.customer.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: { orders: { select: { total: true, status: true } } },
      }),
      prisma.order.findMany({ take: 20, orderBy: { createdAt: "desc" }, select: { id: true, status: true, total: true, createdAt: true, customer: { select: { name: true, email: true } } } }),
      prisma.workflowRun.findMany({ where: { status: { in: ["PENDING", "RUNNING", "WAITING_APPROVAL"] } }, take: 10, orderBy: { createdAt: "desc" }, include: { workflow: { select: { name: true, slug: true } } } }),
      prisma.agentRun.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { agent: { select: { name: true, slug: true } } } }),
      prisma.orderStepLog.findMany({ take: 8, orderBy: { createdAt: "desc" }, select: { id: true, stepName: true, status: true, createdAt: true, orderId: true } }),
      prisma.order.findMany({ take: 300, orderBy: { createdAt: "desc" }, select: { total: true, createdAt: true } }),
      prisma.customer.findMany({ take: 500, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    ]);

    const leads = customers.map((c) => {
      const revenue = c.orders.reduce((a, o) => a + Number(o.total), 0);
      return { id: c.id, name: c.name ?? "Sin nombre", email: c.email ?? "—", deals: c.orders.length, revenue, performance: c.orders.length >= 3 ? "Alta" : c.orders.length >= 1 ? "Media" : "Nueva" };
    }).sort((a, b) => b.revenue - a.revenue);

    const customersRevenue = leads.reduce((a, l) => a + l.revenue, 0);
    const customersDeals = leads.reduce((a, l) => a + l.deals, 0);
    const avgTicket = customersDeals > 0 ? Math.round(customersRevenue / customersDeals) : 0;

    // Crecimiento diario (últimos N días): clientes nuevos + ingresos por día.
    const growth: { day: string; leads: number; revenue: number }[] = [];

    if (month && year) {
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const start = new Date(year, month - 1, d, 0, 0, 0, 0);
        const next = new Date(year, month - 1, d + 1, 0, 0, 0, 0);
        const key = start.toISOString().slice(0, 10);
        const count = customerDates.filter((c) => c.createdAt >= start && c.createdAt < next).length;
        const revenue = orderStats.filter((o) => o.createdAt >= start && o.createdAt < next).reduce((a, o) => a + Number(o.total), 0);
        growth.push({ day: key, leads: count, revenue: Math.round(revenue) });
      }
    } else if (year && !month) {
      for (let m = 0; m < 12; m++) {
        const start = new Date(year, m, 1, 0, 0, 0, 0);
        const next = new Date(year, m + 1, 1, 0, 0, 0, 0);
        const key = start.toISOString().slice(0, 7);
        const count = customerDates.filter((c) => c.createdAt >= start && c.createdAt < next).length;
        const revenue = orderStats.filter((o) => o.createdAt >= start && o.createdAt < next).reduce((a, o) => a + Number(o.total), 0);
        growth.push({ day: key, leads: count, revenue: Math.round(revenue) });
      }
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const count = customerDates.filter((c) => c.createdAt.toISOString().slice(0, 10) === key).length;
        const revenue = orderStats.filter((o) => o.createdAt.toISOString().slice(0, 10) === key).reduce((a, o) => a + Number(o.total), 0);
        growth.push({ day: key, leads: count, revenue: Math.round(revenue) });
      }
    }

    const tasks = [
      ...orders.filter((o) => o.status === "PENDING" || o.status === "FAILED").slice(0, 5).map((o) => ({ id: o.id, title: `Revisar pedido ${o.id.slice(0, 8)} (${ORDER_STATUS_ES[o.status] ?? o.status})`, due: "Hoy", type: "order" })),
      ...pendingRuns.map((r) => ({ id: r.id, title: `${r.workflow.name} — ${RUN_STATUS_ES[r.status] ?? r.status}`, due: "Esta semana", type: "workflow" })),
    ];

    const recentActivities = [
      ...activities.map((a) => ({ id: a.id, text: `${a.agent.name} ejecutado`, at: a.createdAt, kind: "agent" })),
      ...stepLogs.map((s) => ({ id: s.id, text: `${s.stepName} → ${RUN_STATUS_ES[s.status] ?? s.status}`, at: s.createdAt, kind: "workflow" })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8);

    // DEMO_MOCK: CRM activo sin datos reales
    if (DEMO_MODE && customers.length === 0) {
      const now = new Date();
      const baseLeads = [2, 4, 3, 6, 5, 8, 3];
      const baseRevenue = [120000, 210000, 180000, 320000, 290000, 410000, 350000];
      const mockGrowth =
        month && year
          ? Array.from({ length: new Date(year, month, 0).getDate() }).map((_, i) => ({
              day: `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
              leads: baseLeads[i % baseLeads.length],
              revenue: baseRevenue[i % baseRevenue.length],
            }))
          : year && !month
            ? Array.from({ length: 12 }).map((_, i) => ({
                day: `${year}-${String(i + 1).padStart(2, "0")}`,
                leads: baseLeads[i % baseLeads.length] * 3,
                revenue: baseRevenue[i % baseRevenue.length] * 3,
              }))
            : Array.from({ length: days }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (days - 1 - i));
                return { day: d.toISOString().slice(0, 10), leads: baseLeads[i % baseLeads.length], revenue: baseRevenue[i % baseRevenue.length] };
              });
      return NextResponse.json({
        leads: [
          { id: "1", name: "Constructora Andes", email: "contacto@andes.cl", deals: 5, revenue: 420000, performance: "Alta" },
          { id: "2", name: "Ferretería Sur", email: "ventas@sur.cl", deals: 3, revenue: 180000, performance: "Media" },
        ],
        growth: mockGrowth,
        tasks: [{ id: "t1", title: "Revisar pedido DEMO-1001 (Pendiente)", due: "Hoy", type: "order" }],
        recentActivities: [
          { id: "a1", text: "sales-assistant ejecutado", at: now, kind: "agent" },
          { id: "s1", text: "RESERVE_STOCK → Completado", at: now, kind: "workflow" },
        ],
        totals: { customers: 2, revenue: 600000, avgTicket: 75000 },
      });
    }

    return NextResponse.json({ leads, growth, tasks, recentActivities, totals: { customers: customers.length, revenue: customersRevenue, avgTicket } });
  } catch (e) {
    return NextResponse.json({ leads: [], growth: [], tasks: [], recentActivities: [], totals: { customers: 0, revenue: 0, avgTicket: 0 }, warning: e instanceof Error ? e.message : String(e) });
  }
}
