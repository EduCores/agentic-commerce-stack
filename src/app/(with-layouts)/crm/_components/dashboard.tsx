"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { CrmGrowthChart } from "./growth-chart";
import { CrmLeadsReport } from "./leads-report";
import type { CrmData } from "./types";
import Link from "next/link";
import { TrendingUp, Users, Wallet } from "lucide-react";

export function CrmDashboard() {
  const { data, isLoading } = useQuery<CrmData>({
    queryKey: ["crm"],
    queryFn: async () => (await fetch("/api/crm")).json(),
  });

  if (isLoading) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Cargando CRM...</CardContent></Card>;
  if (!data) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Sin datos</CardContent></Card>;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 p-6 text-white md:col-span-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-white/20 [&>svg]:size-4.5">
                <Users />
              </span>
              <p className="text-sm font-medium text-white/90">Clientes</p>
            </div>
            <p className="mt-2 text-4xl font-extrabold tracking-tight">{data.totals.customers.toLocaleString("es-CL")}</p>
          </div>
          <div className="hidden w-px self-stretch bg-white/20 sm:block" />
          <div className="sm:text-right">
            <div className="flex items-center gap-2.5 sm:justify-end">
              <span className="flex size-9 items-center justify-center rounded-lg bg-white/20 [&>svg]:size-4.5">
                <Wallet />
              </span>
              <p className="text-sm font-medium text-white/90">Ingresos por clientes</p>
            </div>
            <p className="mt-2 text-4xl font-extrabold tracking-tight">${data.totals.revenue.toLocaleString("es-CL")}</p>
          </div>
          <div className="hidden w-px self-stretch bg-white/20 sm:block" />
          <div className="sm:text-right">
            <div className="flex items-center gap-2.5 sm:justify-end">
              <span className="flex size-9 items-center justify-center rounded-lg bg-white/20 [&>svg]:size-4.5">
                <TrendingUp />
              </span>
              <p className="text-sm font-medium text-white/90">Ticket promedio</p>
            </div>
            <p className="mt-2 text-4xl font-extrabold tracking-tight">${data.totals.avgTicket.toLocaleString("es-CL")}</p>
          </div>
        </div>
        <Link href="/orders" className="mt-4 inline-block text-xs font-medium text-white/90 underline">Ver /orders</Link>
      </div>
      <CrmGrowthChart data={data} />
      <CrmLeadsReport data={data} />
      <Card>
        <CardHeader><CardTitle className="text-sm">Próximas tareas y reuniones</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.tasks.length === 0 ? <p className="text-sm text-text-tertiary">Sin pendientes. Todo al día.</p> : data.tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-card-border p-2.5 text-sm">
              <span className="line-clamp-1 min-w-0">{t.title}</span>
              <Badge color={t.type === "order" ? "warning" : "gray"}>{t.due}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="md:col-span-3">
        <CardHeader><CardTitle className="text-sm">Actividad reciente</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {data.recentActivities.map((a) => (
            <div key={a.id} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 text-sm">
              <span className="min-w-0">{a.text}</span>
              <span className="shrink-0 text-xs text-text-tertiary">{new Date(a.at).toLocaleString("es-CL")} · <Link href="/workflows" className="underline">workflows</Link></span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
