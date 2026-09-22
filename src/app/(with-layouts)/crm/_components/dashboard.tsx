"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { CrmGrowthChart } from "./growth-chart";
import { CrmLeadsReport } from "./leads-report";
import type { CrmData, CrmRange } from "./types";
import Link from "next/link";
import { TrendingUp, Users, Wallet } from "lucide-react";

export function CrmDashboard() {
  const [days, setDays] = useState<CrmRange>(7);
  const { data, isLoading } = useQuery<CrmData>({
    queryKey: ["crm", days],
    queryFn: async () => (await fetch(`/api/crm?days=${days}`)).json(),
  });

  if (isLoading) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Cargando CRM...</CardContent></Card>;
  if (!data) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Sin datos</CardContent></Card>;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 p-6 text-white md:col-span-3">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-xl bg-white/10 p-4 backdrop-blur">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white/20 [&>svg]:size-7">
              <Users />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white/85">Clientes</p>
              <p className="text-2xl font-extrabold tracking-tight md:text-3xl">{data.totals.customers.toLocaleString("es-CL")}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl bg-white/10 p-4 backdrop-blur">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white/20 [&>svg]:size-7">
              <Wallet />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white/85">Ingresos por clientes</p>
              <p className="text-2xl font-extrabold tracking-tight md:text-3xl">${data.totals.revenue.toLocaleString("es-CL")}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl bg-white/10 p-4 backdrop-blur">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white/20 [&>svg]:size-7">
              <TrendingUp />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white/85">Ticket promedio</p>
              <p className="text-2xl font-extrabold tracking-tight md:text-3xl">${data.totals.avgTicket.toLocaleString("es-CL")}</p>
            </div>
          </div>
        </div>
        <Link href="/orders" className="mt-4 inline-block text-xs font-medium text-white/90 underline">Ver /orders →</Link>
      </div>
      <CrmGrowthChart data={data} days={days} onDays={setDays} />
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
