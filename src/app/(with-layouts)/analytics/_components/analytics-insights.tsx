"use client";

import Link from "next/link";
import { CalendarDays, BadgeCheck, Share2, Package, Lightbulb } from "lucide-react";
import { sharePct } from "@/utils/period-stats";
import type { AnalyticsData } from "./types";

function formatCLP(n: number): string {
  return `$${Number(n).toLocaleString("es-CL")}`;
}

/** Ideas clave de analítica: todo calculado con datos reales del período. */
export function AnalyticsInsights({ data }: { data: AnalyticsData }) {
  const days = data.salesByDay ?? [];
  const peak = days.length > 0 ? days.reduce((a, b) => (b.total > a.total ? b : a), days[0]) : null;
  const sources = data.bySource ?? [];
  const totalSourceRevenue = sources.reduce((a, s) => a + (s.revenue ?? 0), 0);
  const bestSource = sources.length > 0 ? sources.reduce((a, b) => ((b.revenue ?? 0) > (a.revenue ?? 0) ? b : a), sources[0]) : null;
  const bestShare = bestSource ? sharePct(bestSource.revenue ?? 0, totalSourceRevenue) : 0;
  const top = (data.topContent ?? [])[0] ?? null;
  const topRevenue = (data.topContent ?? []).reduce((a, t) => a + (t.revenue ?? 0), 0);
  const conversion = data.totals.conversion ?? 0;
  const lowCount = (data.lowStock ?? []).length;

  return (
    <div className="min-w-0 rounded-xl border border-card-border bg-card-background p-5 md:col-span-3">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-badge-violet-background text-badge-violet-text [&>svg]:size-4">
          <Lightbulb />
        </span>
        <div className="min-w-0">
          <h3 className="min-w-0 truncate text-sm font-semibold tracking-[-0.2px] text-text-primary">Ideas clave — qué dicen tus números</h3>
          <p className="truncate text-xs text-text-tertiary">Generadas automáticamente con datos reales del período</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {peak && (
          <div className="flex min-w-0 items-start gap-2.5 rounded-lg border border-card-border/60 p-3">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-sky-600" />
            <p className="min-w-0 text-xs leading-4 text-text-secondary">
              Pico el <strong className="text-text-primary">{peak.date.slice(5)}</strong> con{" "}
              <strong className="text-text-primary">{formatCLP(peak.total)}</strong> ({peak.orders} pedidos).
            </p>
          </div>
        )}
        <div className="flex min-w-0 items-start gap-2.5 rounded-lg border border-card-border/60 p-3">
          <BadgeCheck className="mt-0.5 size-4 shrink-0 text-violet-600" />
          <p className="min-w-0 text-xs leading-4 text-text-secondary">
            Conversión a pago del <strong className="text-text-primary">{conversion}%</strong> en el período.
          </p>
        </div>
        {bestSource && (
          <div className="flex min-w-0 items-start gap-2.5 rounded-lg border border-card-border/60 p-3">
            <Share2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <p className="min-w-0 text-xs leading-4 text-text-secondary">
              <strong className="text-text-primary">{bestSource.source}</strong> concentra el{" "}
              <strong className="text-text-primary">{bestShare.toLocaleString("es-CL")}%</strong> de los ingresos por canal.
            </p>
          </div>
        )}
        {top && (
          <div className="flex min-w-0 items-start gap-2.5 rounded-lg border border-card-border/60 p-3">
            <Package className="mt-0.5 size-4 shrink-0 text-teal-600" />
            <p className="min-w-0 text-xs leading-4 text-text-secondary">
              <strong className="text-text-primary">{top.title}</strong> aporta el{" "}
              <strong className="text-text-primary">{sharePct(top.revenue ?? 0, topRevenue).toLocaleString("es-CL")}%</strong> de los ingresos top.
            </p>
          </div>
        )}
      </div>

      <p className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-xs leading-4 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">
        <strong>Recomendación:</strong>{" "}
        {lowCount > 0 ? (
          <>reponé los <strong>{lowCount} productos en quiebre</strong> antes del próximo pico. <Link href="/products" className="font-bold underline">Ver stock →</Link></>
        ) : bestShare >= 60 ? (
          <>diversificá canales: <strong>{bestSource?.source}</strong> concentra el {bestShare.toLocaleString("es-CL")}%. <Link href="/marketing" className="font-bold underline">Ver canales →</Link></>
        ) : (
          <>mantené el ritmo del <strong>{peak ? peak.date.slice(5) : "mejor día"}</strong> repitiendo lo que funcionó. <Link href="/marketing" className="font-bold underline">Ver marketing →</Link></>
        )}
      </p>
    </div>
  );
}
