"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { AiActivityChart } from "./activity-chart";
import { AiAgentsTable } from "./agents-table";
import type { AiStats } from "./types";
import Link from "next/link";

export function AiDashboard() {
  const { data, isLoading } = useQuery<AiStats>({
    queryKey: ["ai-stats"],
    queryFn: async () => (await fetch("/api/ai/stats")).json(),
  });

  if (isLoading) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Cargando AI...</CardContent></Card>;
  if (!data) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Sin datos</CardContent></Card>;

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-3">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader><CardTitle className="text-sm">Analítica de costos de AI</CardTitle></CardHeader>
        <CardContent className="min-w-0 break-words">
          <p className="text-2xl font-bold">${data.totals.cost.toLocaleString("es-CL")}</p>
          <p className="text-xs text-text-tertiary">{data.totals.requests} solicitudes · {data.totals.successRate}% éxito · {data.totals.activeAgents} agentes activos</p>
        </CardContent>
      </Card>
      <AiActivityChart data={data} />
      <AiAgentsTable data={data} />
      <Card className="min-w-0 overflow-hidden">
        <CardHeader><CardTitle className="text-sm">Distribución de proveedores de AI</CardTitle></CardHeader>
        <CardContent className="min-w-0 space-y-2 break-words">
          {data.providers.map((p) => (
            <div key={p.name} className="flex min-w-0 items-center justify-between gap-2 text-sm">
              <span className="min-w-0 break-words font-mono text-xs">{p.name}</span>
              <Badge color="gray">{p.pct}%</Badge>
            </div>
          ))}
          <Link href="/admin" className="text-xs font-medium text-brand-600 underline">Probar en /admin</Link>
        </CardContent>
      </Card>
      <Card className="min-w-0 overflow-hidden md:col-span-3">
        <CardHeader><CardTitle className="text-sm">Actividad del Agente</CardTitle></CardHeader>
        <CardContent className="min-w-0 space-y-1.5 break-words">
          {data.recent.length === 0 ? <p className="text-sm text-text-tertiary">Sin ejecuciones aún.</p> : data.recent.map((r) => (
            <div key={r.id} className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
              <span className="min-w-0 break-words">{r.agent}</span>
              <span className="shrink-0 text-xs text-text-tertiary">{r.status} · {new Date(r.at).toLocaleString("es-CL")} · <Link href="/workflows" className="underline">workflows</Link></span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
