import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [customers, orders, pendingRuns, activities, stepLogs] = await Promise.all([
      prisma.customer.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: { orders: { select: { total: true, status: true } } },
      }),
      prisma.order.findMany({ take: 20, orderBy: { createdAt: "desc" }, select: { id: true, status: true, total: true, createdAt: true, customer: { select: { name: true, email: true } } } }),
      prisma.workflowRun.findMany({ where: { status: { in: ["PENDING", "RUNNING", "WAITING_APPROVAL"] } }, take: 10, orderBy: { createdAt: "desc" }, include: { workflow: { select: { name: true, slug: true } } } }),
      prisma.agentRun.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { agent: { select: { name: true, slug: true } } } }),
      prisma.orderStepLog.findMany({ take: 8, orderBy: { createdAt: "desc" }, select: { id: true, stepName: true, status: true, createdAt: true, orderId: true } }),
    ]);

    const leads = customers.map((c) => {
      const revenue = c.orders.reduce((a, o) => a + Number(o.total), 0);
      return { id: c.id, name: c.name ?? "Sin nombre", email: c.email ?? "—", deals: c.orders.length, revenue, performance: c.orders.length >= 3 ? "Alta" : c.orders.length >= 1 ? "Media" : "Nueva" };
    }).sort((a, b) => b.revenue - a.revenue);

    // Crecimiento semanal de leads (últimas 6 semanas)
    const growth: { week: string; leads: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i * 7 - 6);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const count = customers.filter((c) => c.createdAt >= start && c.createdAt < end).length;
      growth.push({ week: `S-${5 - i + 1}`, leads: count });
    }

    const tasks = [
      ...orders.filter((o) => o.status === "PENDING" || o.status === "FAILED").slice(0, 5).map((o) => ({ id: o.id, title: `Revisar pedido ${o.id.slice(0, 8)} (${o.status})`, due: "Hoy", type: "order" })),
      ...pendingRuns.map((r) => ({ id: r.id, title: `${r.workflow.name} — ${r.status}`, due: "Esta semana", type: "workflow" })),
    ];

    const recentActivities = [
      ...activities.map((a) => ({ id: a.id, text: `${a.agent.name} ejecutado`, at: a.createdAt, kind: "agent" })),
      ...stepLogs.map((s) => ({ id: s.id, text: `${s.stepName} → ${s.status}`, at: s.createdAt, kind: "workflow" })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8);

    return NextResponse.json({ leads, growth, tasks, recentActivities, totals: { customers: customers.length } });
  } catch (e) {
    return NextResponse.json({ leads: [], growth: [], tasks: [], recentActivities: [], totals: { customers: 0 }, warning: e instanceof Error ? e.message : String(e) });
  }
}
