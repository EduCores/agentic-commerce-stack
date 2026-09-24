"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { AiActivityChart } from "./activity-chart";
import { AiAgentsTable } from "./agents-table";
import { AiModelsChart } from "./models-chart";
import type { AiStats, AiRange } from "./types";
import { AGENT_STATUS_ES } from "./types";
import Link from "next/link";
import { Activity, BadgeCheck, Bot, Wallet } from "lucide-react";

export function AiDashboard() {
  const [days, setDays] = useState<AiRange>(21);
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");
  const { data, isLoading } = useQuery<AiStats>({
    queryKey: ["ai-stats", days, month, year],
    queryFn: async () => {
      const params = new URLSearchParams({ days: String(days) });
      if (month !== "all") params.set("month", month);
      if (year !== "all") params.set("year", year);
      return (await fetch(`/api/ai/stats?${params}`)).json();
    },
  });

  if (isLoading) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Cargando AI...</CardContent></Card>;
  if (!data) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Sin datos</CardContent></Card>;

  const avgCost = data.totals.requests > 0 ? data.totals.cost / data.totals.requests : 0;
  const providerMain = data.providers[0];
  const periodLabel =
    month !== "all" && year !== "all"
      ? `${month}/${year}`
      : month !== "all"
        ? `mes ${month}`
        : year !== "all"
          ? `año ${year}`
          : `${days} días`;

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-3">
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-primary-500 to-[#328e8f] p-6 text-white md:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold tracking-[-0.2px]">Analítica de costos de AI</h3>
            <p className="text-xs text-white/75">
              OpenRouter · {data.totals.requests.toLocaleString("es-CL")} solicitudes en {periodLabel} · {providerMain?.name ?? "openrouter/qwen"} lidera con {providerMain?.pct ?? 72}%
            </p>
          </div>
          <Link href="/admin" className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur hover:bg-white/20">
            Probar en /admin →
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 [&>svg]:size-4">
                <Wallet />
              </span>
              <p className="text-xs font-medium text-white/80">Costo total</p>
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight">${data.totals.cost.toLocaleString("es-CL")}</p>
            <p className="text-xs text-white/70">${avgCost.toFixed(2)} por solicitud · modelo Qwen3-30B</p>
          </div>
          <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 [&>svg]:size-4">
                <Activity />
              </span>
              <p className="text-xs font-medium text-white/80">Solicitudes</p>
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight">{data.totals.requests.toLocaleString("es-CL")}</p>
            <p className="text-xs text-white/70">{Math.round(data.totals.requests / days)} por día promedio</p>
          </div>
          <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 [&>svg]:size-4">
                <BadgeCheck />
              </span>
              <p className="text-xs font-medium text-white/80">Tasa de éxito</p>
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight">{data.totals.successRate.toLocaleString("es-CL")}%</p>
            <p className="text-xs text-white/70">{data.totals.successRate >= 95 ? "Excelente" : data.totals.successRate >= 85 ? "Buena" : "Revisar"} · objetivo 95%</p>
          </div>
          <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 [&>svg]:size-4">
                <Bot />
              </span>
              <p className="text-xs font-medium text-white/80">Agentes activos</p>
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight">{data.totals.activeAgents}</p>
            <p className="text-xs text-white/70">{data.table.filter((a) => a.active).length} de {data.table.length} en tabla</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/15 pt-4">
          <span className="text-xs font-medium text-white/80">Proveedores</span>
          {data.providers.map((p) => (
            <span key={p.name} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 font-mono text-xs font-bold text-white backdrop-blur">
              <span className="size-2 rounded-full bg-white/90" />
              {p.name} {p.pct}%
            </span>
          ))}
          <span className="ml-auto hidden text-xs text-white/60 sm:inline">Costo fijo $0.90 por ejecución · Resend en prod</span>
        </div>
      </div>
      <AiActivityChart data={data} days={days} onDays={setDays} month={month} year={year} onMonth={setMonth} onYear={setYear} />
      <AiModelsChart data={data} />
      <AiAgentsTable data={data} />
      <Card className="min-w-0 overflow-hidden md:col-span-3">
        <CardHeader><CardTitle className="text-sm">Actividad del Agente</CardTitle></CardHeader>
        <CardContent className="min-w-0 space-y-2">
          {data.recent.length === 0 ? <p className="text-sm text-text-tertiary">Sin ejecuciones aún.</p> : data.recent.map((r) => (
            <div key={r.id} className="min-w-0 rounded-lg border border-card-border/60 px-3 py-2">
              <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-text-primary">
                <span className={`size-2 shrink-0 rounded-full ${r.status === "COMPLETED" ? "bg-emerald-500" : r.status === "FAILED" ? "bg-red-500" : r.status === "RUNNING" ? "bg-amber-500" : "bg-gray-300"}`} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{r.agent}</span>
                <span className="shrink-0 text-xs font-bold text-text-secondary">{AGENT_STATUS_ES[r.status] ?? r.status}</span>
              </p>
              <p className="mt-1 pl-4 text-xs text-text-tertiary">{new Date(r.at).toLocaleString("es-CL")} · <Link href="/workflows" className="font-medium text-brand-600 underline">workflows</Link></p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
