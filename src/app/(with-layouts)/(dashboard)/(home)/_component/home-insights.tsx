"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Trophy, CalendarDays, BadgeCheck, TriangleAlert, Lightbulb } from "lucide-react";
import { formatCLP } from "./home-types";

type MarketingData = {
  channels: { channel: string; revenue: number; convRate: number }[];
  funnel: { stage: string; value: number }[];
};

type AnalyticsData = {
  salesByDay: { date: string; total: number; orders: number }[];
  byStatus: { status: string; count: number; revenue: number }[];
  lowStock: { title: string; sku: string; stock: number }[];
};

/** Ideas clave del negocio: todo calculado con datos reales ya disponibles. */
export function HomeInsights() {
  const { data: marketing } = useQuery<MarketingData>({
    queryKey: ["home-insights-marketing"],
    queryFn: async () => (await fetch("/api/marketing")).json(),
    refetchInterval: 60000,
  });
  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ["home-insights-analytics"],
    queryFn: async () => (await fetch("/api/analytics")).json(),
    refetchInterval: 60000,
  });

  const channels = marketing?.channels ?? [];
  const best = [...channels].sort((a, b) => b.convRate - a.convRate)[0];
  const funnel = marketing?.funnel ?? [];
  let worstStep: { stage: string; prev: string; conv: number } | null = null;
  for (let i = 1; i < funnel.length; i++) {
    const prev = funnel[i - 1].value || 1;
    const conv = Math.round((funnel[i].value / prev) * 1000) / 10;
    if (!worstStep || conv < worstStep.conv) worstStep = { stage: funnel[i].stage, prev: funnel[i - 1].stage, conv };
  }

  const days = analytics?.salesByDay ?? [];
  const peak = days.length > 0 ? days.reduce((a, b) => (b.total > a.total ? b : a), days[0]) : null;
  const status = analytics?.byStatus ?? [];
  const totalOrders = status.reduce((a, s) => a + s.count, 0);
  const paidOrders = status.filter((s) => ["PAID", "FULFILLED"].includes(s.status)).reduce((a, s) => a + s.count, 0);
  const paidRate = totalOrders > 0 ? Math.round((paidOrders / totalOrders) * 1000) / 10 : 0;
  const lowCount = (analytics?.lowStock ?? []).length;

  if (!marketing && !analytics) {
    return (
      <div className="min-w-0 rounded-xl border border-card-border bg-card-background p-5">
        <p className="text-xs text-text-tertiary">Generando ideas con tus datos…</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 rounded-xl border border-card-border bg-card-background p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-badge-violet-background text-badge-violet-text [&>svg]:size-4">
          <Lightbulb />
        </span>
        <div className="min-w-0">
          <h3 className="min-w-0 truncate text-sm font-semibold tracking-[-0.2px] text-text-primary">Ideas clave — qué dicen tus números</h3>
          <p className="truncate text-xs text-text-tertiary">Generadas automáticamente con datos reales</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {best && (
          <div className="flex min-w-0 items-start gap-2.5 rounded-lg border border-card-border/60 p-3">
            <Trophy className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <p className="min-w-0 text-xs leading-4 text-text-secondary">
              <strong className="text-text-primary">{best.channel}</strong> es tu mejor canal con{" "}
              <strong className="text-text-primary">{best.convRate}% conversión</strong>. Refuérzalo con presupuesto o destacados.
            </p>
          </div>
        )}
        {peak && (
          <div className="flex min-w-0 items-start gap-2.5 rounded-lg border border-card-border/60 p-3">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-sky-600" />
            <p className="min-w-0 text-xs leading-4 text-text-secondary">
              Tu mejor día fue <strong className="text-text-primary">{peak.date.slice(5)}</strong> con{" "}
              <strong className="text-text-primary">{formatCLP(peak.total)}</strong> en {peak.orders} pedidos.
            </p>
          </div>
        )}
        {totalOrders > 0 && (
          <div className="flex min-w-0 items-start gap-2.5 rounded-lg border border-card-border/60 p-3">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-violet-600" />
            <p className="min-w-0 text-xs leading-4 text-text-secondary">
              <strong className="text-text-primary">{paidRate}% de los pedidos</strong> termina pagado o completado ({paidOrders} de {totalOrders}).
            </p>
          </div>
        )}
        {lowCount > 0 && (
          <div className="flex min-w-0 items-start gap-2.5 rounded-lg border border-card-border/60 p-3">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-teal-600" />
            <p className="min-w-0 text-xs leading-4 text-text-secondary">
              <strong className="text-text-primary">{lowCount} productos</strong> con stock crítico.{" "}
              <Link href="/products" className="font-bold text-brand-600 underline">Reponer →</Link>
            </p>
          </div>
        )}
      </div>

      {worstStep && (
        <p className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-xs leading-4 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">
          <strong>Recomendación:</strong> refuerza <strong>{worstStep.stage}</strong> — solo el {worstStep.conv}% avanza desde {worstStep.prev}.{" "}
          <Link href="/marketing" className="font-bold underline">Ver embudo →</Link>
        </p>
      )}
    </div>
  );
}
