import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { DEMO_MODE } from "@/lib/demo";

export const dynamic = "force-dynamic";

const COST_PER_RUN: Record<string, number> = {
  "nvidia/nemotron-3-ultra": 0.0,
  "qwen/qwen3-30b-a3b-instruct-2507": 0.9,
  // Fake para demo (quitar en entrega): Gemini, Claude, Chat-GPT
  "google/gemini-pro": 1.2,
  "anthropic/claude-3-5-sonnet": 1.5,
  "openai/gpt-4": 2.0,
  "openai/gpt-4o-mini": 1.0,
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawDays = Number(url.searchParams.get("days"));
  const days = [7, 14, 21, 28].includes(rawDays) ? rawDays : 21;
  const rawMonth = Number(url.searchParams.get("month"));
  const rawYear = Number(url.searchParams.get("year"));
  const month = rawMonth >= 1 && rawMonth <= 12 ? rawMonth : null;
  const year = rawYear >= 2020 && rawYear <= 2035 ? rawYear : null;
  try {
    const [agents, runs, wfRuns, recentRuns, ordersAgg] = await Promise.all([
      prisma.agent.findMany({ select: { id: true, name: true, slug: true, model: true, isActive: true, _count: { select: { runs: true } } }, take: 20, orderBy: { createdAt: "desc" } }),
      prisma.agentRun.findMany({ select: { status: true, createdAt: true, agent: { select: { model: true, name: true } } }, take: 800, orderBy: { createdAt: "desc" } }),
      prisma.workflowRun.groupBy({ by: ["status"], _count: { status: true } }).catch(() => []),
      prisma.agentRun.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { agent: { select: { name: true } } } }),
      prisma.order.aggregate({ _sum: { total: true }, where: { status: { in: ["PAID", "FULFILLED"] } } }).catch(() => ({ _sum: { total: null } })),
    ]);

    // Rango por Mes/Año si se filtró — pisa los últimos N días
    let byDay: { day: string; requests: number }[] = [];
    if (month && year) {
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const start = new Date(year, month - 1, d, 0, 0, 0, 0);
        const end = new Date(year, month - 1, d + 1, 0, 0, 0, 0);
        byDay.push({ day: String(d).padStart(2, "0"), requests: runs.filter((r) => r.createdAt >= start && r.createdAt < end).length });
      }
    } else if (year && !month) {
      for (let m = 0; m < 12; m++) {
        const start = new Date(year, m, 1, 0, 0, 0, 0);
        const end = new Date(year, m + 1, 1, 0, 0, 0, 0);
        const mm = String(m + 1).padStart(2, "0");
        byDay.push({ day: mm, requests: runs.filter((r) => r.createdAt >= start && r.createdAt < end).length });
      }
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        byDay.push({ day: d.toISOString().slice(5, 10), requests: runs.filter((r) => r.createdAt >= d && r.createdAt < next).length });
      }
    }

    const completed = runs.filter((r) => r.status === "COMPLETED").length;
    const successRate = runs.length ? Math.round((completed / runs.length) * 1000) / 10 : 0;
    const cost = runs.reduce((a, r) => a + (COST_PER_RUN[r.agent?.model ?? ""] ?? 0.9), 0);
    const totalRevenue = Number(ordersAgg._sum.total ?? 0);
    const avgRevenuePerReq = runs.length > 0 ? totalRevenue / runs.length : 0;

    const table = agents.map((a) => {
      const req = a._count.runs;
      const agentCost = runs.filter((r) => r.agent?.name === a.name).reduce((s, r) => s + (COST_PER_RUN[r.agent?.model ?? ""] ?? 0.9), 0);
      const revenue = Math.round(req * avgRevenuePerReq);
      return {
        id: a.id,
        name: a.name,
        slug: a.slug,
        model: a.model,
        active: a.isActive,
        requests: req,
        success: runs.length ? successRate : 100,
        cost: Math.round(agentCost * 100) / 100,
        revenue,
      };
    });

    const byModelMap = runs.reduce<Record<string, { requests: number; cost: number }>>((acc, r) => {
      const m = r.agent?.model ?? "desconocido";
      acc[m] = acc[m] ?? { requests: 0, cost: 0 };
      acc[m].requests += 1;
      acc[m].cost += COST_PER_RUN[m] ?? 0.9;
      return acc;
    }, {});
    const byModel = Object.entries(byModelMap)
      .map(([model, v]) => ({
        model,
        requests: v.requests,
        cost: Math.round(v.cost * 100) / 100,
        revenue: Math.round(v.requests * avgRevenuePerReq),
      }))
      .sort((a, b) => b.requests - a.requests);

    // --- DEMO FAKE (quitar en entrega): inyecta Gemini, Claude y Chat-GPT para mostrar variedad ---
    if (!byModel.some((m) => m.model.includes("gemini"))) {
      byModel.push({ model: "google/gemini-pro", requests: 18, cost: 21.6, revenue: Math.round(18 * avgRevenuePerReq) || 540000 });
    }
    if (!byModel.some((m) => m.model.includes("claude"))) {
      byModel.push({ model: "anthropic/claude-3-5-sonnet", requests: 14, cost: 21.0, revenue: Math.round(14 * avgRevenuePerReq) || 420000 });
    }
    if (!byModel.some((m) => m.model === "openai/gpt-4")) {
      byModel.push({ model: "openai/gpt-4", requests: 22, cost: 44.0, revenue: Math.round(22 * avgRevenuePerReq) || 680000 });
    }
    byModel.sort((a, b) => b.requests - a.requests);

    const providers = [
      { name: "openrouter/qwen", pct: 72 },
      { name: "openai", pct: 14 },
      { name: "anthropic", pct: 9 },
      { name: "otros", pct: 5 },
    ];

    // DEMO_MOCK: AI activo sin ejecuciones reales
    if (DEMO_MODE && runs.length === 0) {
      const now = new Date();
      const base = [4, 7, 5, 9, 6, 8, 3];
      const demoByDay =
        month && year
          ? Array.from({ length: new Date(year, month, 0).getDate() }).map((_, i) => ({ day: String(i + 1).padStart(2, "0"), requests: base[i % base.length] }))
          : year && !month
            ? Array.from({ length: 12 }).map((_, i) => ({ day: String(i + 1).padStart(2, "0"), requests: base[i % base.length] }))
            : Array.from({ length: days }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (days - 1 - i));
                return { day: d.toISOString().slice(5, 10), requests: base[i % base.length] };
              });
      return NextResponse.json({
        totals: { requests: 42, cost: 37.8, successRate: 96.4, activeAgents: 8 },
        byDay: demoByDay,
        table: [
          { id: "1", name: "Asistente Ventas", slug: "sales-assistant", model: "nvidia/nemotron-3-ultra", active: true, requests: 12, success: 96.4, cost: 10.8, revenue: 420000 },
          { id: "2", name: "Soporte Checkout", slug: "checkout-support", model: "nvidia/nemotron-3-ultra", active: true, requests: 8, success: 96.4, cost: 7.2, revenue: 280000 },
        ],
        // Fake demo (quitar en entrega)
        byModel: [
          { model: "nvidia/nemotron-3-ultra", requests: 32, cost: 28.8, revenue: 890000 },
          { model: "openai/gpt-4", requests: 22, cost: 44.0, revenue: 680000 },
          { model: "google/gemini-pro", requests: 18, cost: 21.6, revenue: 540000 },
          { model: "anthropic/claude-3-5-sonnet", requests: 14, cost: 21.0, revenue: 420000 },
          { model: "openai/gpt-4o-mini", requests: 10, cost: 9.0, revenue: 310000 },
        ],
        providers,
        workflows: [{ status: "COMPLETED", _count: { status: 12 } }],
        recent: [{ id: "r1", agent: "sales-assistant", status: "COMPLETED", at: now }],
      });
    }

    return NextResponse.json({
      totals: { requests: runs.length, cost: Math.round(cost * 100) / 100, successRate, activeAgents: agents.filter((a) => a.isActive).length },
      byDay,
      table,
      byModel,
      providers,
      workflows: wfRuns,
      recent: recentRuns.map((r) => ({ id: r.id, agent: r.agent.name, status: r.status, at: r.createdAt })),
    });
  } catch (e) {
    return NextResponse.json({ totals: { requests: 0, cost: 0, successRate: 0, activeAgents: 0 }, byDay: [], table: [], byModel: [], providers: [], workflows: [], recent: [], warning: e instanceof Error ? e.message : String(e) });
  }
}
