"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { AiActivityChart } from "./activity-chart";
import { AiAgentsTable } from "./agents-table";
import type { AiStats } from "./types";

export function AiDashboard() {
  const { data, isLoading } = useQuery<AiStats>({
    queryKey: ["ai-stats"],
    queryFn: async () => (await fetch("/api/ai/stats")).json(),
  });

  if (isLoading) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Cargando AI...</CardContent></Card>;
  if (!data) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Sin datos</CardContent></Card>;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader><CardTitle className="text-sm">AI Cost Analytics</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">${data.totals.cost.toLocaleString("es-CL")}</p>
          <p className="text-xs text-text-tertiary">{data.totals.requests} requests · {data.totals.successRate}% éxito · {data.totals.activeAgents} agentes activos</p>
        </CardContent>
      </Card>
      <AiActivityChart data={data} />
      <AiAgentsTable data={data} />
      <Card>
        <CardHeader><CardTitle className="text-sm">AI Provider Distribution</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.providers.map((p) => (
            <div key={p.name} className="flex items-center justify-between text-sm">
              <span className="font-mono text-xs">{p.name}</span>
              <Badge color="gray">{p.pct}%</Badge>
            </div>
          ))}
          <a href="/admin" className="text-xs font-medium text-brand-600 underline">Probar en /admin</a>
        </CardContent>
      </Card>
      <Card className="md:col-span-3">
        <CardHeader><CardTitle className="text-sm">Recent Activities</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {data.recent.length === 0 ? <p className="text-sm text-text-tertiary">Sin ejecuciones aún.</p> : data.recent.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm">
              <span>{r.agent}</span>
              <span className="text-xs text-text-tertiary">{r.status} · {new Date(r.at).toLocaleString("es-CL")} · <a href="/workflows" className="underline">workflows</a></span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
