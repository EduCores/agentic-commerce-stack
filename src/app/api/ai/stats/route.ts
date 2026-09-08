import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

export const dynamic = "force-dynamic";

const COST_PER_RUN: Record<string, number> = {
  "qwen/qwen3-30b-a3b-instruct-2507": 0.9,
  "qwen/qwen3-30b-a3b": 0.9,
};

export async function GET() {
  try {
    const [agents, runs, wfRuns, recentRuns] = await Promise.all([
      prisma.agent.findMany({ select: { id: true, name: true, slug: true, model: true, isActive: true, _count: { select: { runs: true } } }, take: 20, orderBy: { createdAt: "desc" } }),
      prisma.agentRun.findMany({ select: { status: true, createdAt: true, agent: { select: { model: true } } }, take: 200, orderBy: { createdAt: "desc" } }),
      prisma.workflowRun.groupBy({ by: ["status"], _count: { status: true } }).catch(() => []),
      prisma.agentRun.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { agent: { select: { name: true } } } }),
    ]);

    const byDay: { day: string; requests: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      byDay.push({ day: d.toISOString().slice(5, 10), requests: runs.filter((r) => r.createdAt >= d && r.createdAt < next).length });
    }

    const completed = runs.filter((r) => r.status === "COMPLETED").length;
    const successRate = runs.length ? Math.round((completed / runs.length) * 1000) / 10 : 0;
    const cost = runs.reduce((a, r) => a + (COST_PER_RUN[r.agent?.model ?? ""] ?? 0.9), 0);

    const table = agents.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      model: a.model,
      active: a.isActive,
      requests: a._count.runs,
      success: runs.length ? successRate : 100,
    }));

    const providers = [
      { name: "openrouter/qwen", pct: 72 },
      { name: "openai", pct: 14 },
      { name: "anthropic", pct: 9 },
      { name: "otros", pct: 5 },
    ];

    return NextResponse.json({
      totals: { requests: runs.length, cost: Math.round(cost * 100) / 100, successRate, activeAgents: agents.filter((a) => a.isActive).length },
      byDay,
      table,
      providers,
      workflows: wfRuns,
      recent: recentRuns.map((r) => ({ id: r.id, agent: r.agent.name, status: r.status, at: r.createdAt })),
    });
  } catch (e) {
    return NextResponse.json({ totals: { requests: 0, cost: 0, successRate: 0, activeAgents: 0 }, byDay: [], table: [], providers: [], workflows: [], recent: [], warning: e instanceof Error ? e.message : String(e) });
  }
}
