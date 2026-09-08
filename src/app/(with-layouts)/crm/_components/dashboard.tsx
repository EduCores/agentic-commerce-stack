"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { CrmGrowthChart } from "./growth-chart";
import { CrmLeadsReport } from "./leads-report";
import type { CrmData } from "./types";

export function CrmDashboard() {
  const { data, isLoading } = useQuery<CrmData>({
    queryKey: ["crm"],
    queryFn: async () => (await fetch("/api/crm")).json(),
  });

  if (isLoading) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Cargando CRM...</CardContent></Card>;
  if (!data) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Sin datos</CardContent></Card>;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader><CardTitle className="text-sm">Clientes</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data.totals.customers}</p>
          <p className="text-xs text-text-tertiary">Leads reales desde pedidos</p>
          <a href="/orders" className="text-xs font-medium text-brand-600 underline">Ver /orders</a>
        </CardContent>
      </Card>
      <CrmGrowthChart data={data} />
      <CrmLeadsReport data={data} />
      <Card>
        <CardHeader><CardTitle className="text-sm">Upcoming Tasks & Meetings</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.tasks.length === 0 ? <p className="text-sm text-text-tertiary">Sin pendientes. Todo al día.</p> : data.tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border border-card-border p-2.5 text-sm">
              <span className="line-clamp-1">{t.title}</span>
              <Badge color={t.type === "order" ? "warning" : "gray"}>{t.due}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="md:col-span-3">
        <CardHeader><CardTitle className="text-sm">Recent Activities</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {data.recentActivities.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm">
              <span>{a.text}</span>
              <span className="text-xs text-text-tertiary">{new Date(a.at).toLocaleString("es-CL")} · <a href="/workflows" className="underline">workflows</a></span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
