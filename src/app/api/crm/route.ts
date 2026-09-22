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

export async function GET() {
  try {
    const [customers, orders, pendingRuns, activities, stepLogs, orderStats] = await Promise.all([
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
    ]);

    const leads = customers.map((c) => {
      const revenue = c.orders.reduce((a, o) => a + Number(o.total), 0);
      return { id: c.id, name: c.name ?? "Sin nombre", email: c.email ?? "—", deals: c.orders.length, revenue, performance: c.orders.length >= 3 ? "Alta" : c.orders.length >= 1 ? "Media" : "Nueva" };
    }).sort((a, b) => b.revenue - a.revenue);

    const customersRevenue = leads.reduce((a, l) => a + l.revenue, 0);
    const customersDeals = leads.reduce((a, l) => a + l.deals, 0);
    const avgTicket = customersDeals > 0 ? Math.round(customersRevenue / customersDeals) : 0;

    // Crecimiento semanal (últimas 6 semanas): clientes nuevos + ingresos.
    const growth: { week: string; leads: number; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i * 7 - 6);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const count = customers.filter((c) => c.createdAt >= start && c.createdAt < end).length;
      const revenue = orderStats
        .filter((o) => o.createdAt >= start && o.createdAt < end)
        .reduce((a, o) => a + Number(o.total), 0);
      growth.push({ week: `S-${5 - i + 1}`, leads: count, revenue: Math.round(revenue) });
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
      return NextResponse.json({
        leads: [
          { id: "1", name: "Constructora Andes", email: "contacto@andes.cl", deals: 5, revenue: 420000, performance: "Alta" },
          { id: "2", name: "Ferretería Sur", email: "ventas@sur.cl", deals: 3, revenue: 180000, performance: "Media" },
        ],
        growth: Array.from({ length: 6 }).map((_, i) => ({ week: `S-${i+1}`, leads: [2,4,3,6,5,8][i], revenue: [120000,210000,180000,320000,290000,410000][i] })),
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
