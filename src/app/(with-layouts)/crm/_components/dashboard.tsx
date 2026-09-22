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
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 p-6 text-white md:col-span-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 text-white [&>svg]:size-4">
            <Users />
          </span>
          <h3 className="text-sm font-bold tracking-[-0.2px]">Clientes, tareas y actividad — ligada a pedidos y agente</h3>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-xl bg-white/10 p-4 backdrop-blur">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white shadow-sm [&>svg]:size-8">
              <Users />
            </span>
            <div className="min-w-0 text-left">
              <p className="text-sm font-medium text-white/80">Clientes</p>
              <p className="text-3xl font-extrabold tracking-tight">{data.totals.customers.toLocaleString("es-CL")}</p>
              <p className="text-xs text-white/70">{data.leads.length} leads reales</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl bg-white/10 p-4 backdrop-blur">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white shadow-sm [&>svg]:size-8">
              <Wallet />
            </span>
            <div className="min-w-0 text-left">
              <p className="text-sm font-medium text-white/80">Ingresos por clientes</p>
              <p className="text-3xl font-extrabold tracking-tight">${data.totals.revenue.toLocaleString("es-CL")}</p>
              <p className="text-xs text-white/70">Acumulado real</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl bg-white/10 p-4 backdrop-blur">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white shadow-sm [&>svg]:size-8">
              <TrendingUp />
            </span>
            <div className="min-w-0 text-left">
              <p className="text-sm font-medium text-white/80">Ticket promedio</p>
              <p className="text-3xl font-extrabold tracking-tight">${data.totals.avgTicket.toLocaleString("es-CL")}</p>
              <p className="text-xs text-white/70">Por pedido</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/15 pt-4 text-xs text-white/70">
          <span>Datos vivos de tus pedidos y del agente StarShop</span>
          <Link href="/orders" className="ml-auto rounded-lg bg-white px-3 py-1.5 font-bold text-emerald-700 hover:bg-white/90">
            Ver /orders →
          </Link>
        </div>
      </div>
      <CrmGrowthChart data={data} days={days} onDays={setDays} />
      <CrmLeadsReport data={data} />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 [&>svg]:size-4">
              <TrendingUp />
            </span>
            <CardTitle className="text-sm">Próximas tareas y reuniones</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
          {data.tasks.length === 0 ? <p className="mt-3 text-sm text-text-tertiary">Sin pendientes. Todo al día.</p> : data.tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-lg border border-card-border bg-card-background p-3 text-sm transition hover:border-brand-500/40">
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${t.type === "order" ? "bg-badge-warning-background text-badge-warning-text" : "bg-badge-sky-background text-badge-sky-text"} [&>svg]:size-4`}>
                {t.type === "order" ? <Wallet /> : <TrendingUp />}
              </span>
              <span className="line-clamp-1 min-w-0 flex-1 font-medium text-text-primary">{t.title}</span>
              <Badge color={t.type === "order" ? "warning" : "gray"}>{t.due}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="md:col-span-3">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 [&>svg]:size-4">
              <Users />
            </span>
            <CardTitle className="text-sm">Actividad reciente — ligada a pedidos y agente</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500" />
          <div className="mt-3 space-y-2">
            {data.recentActivities.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg border border-card-border/60 px-3 py-2.5 text-sm transition hover:bg-background-gray-secondary/40">
                <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
                <span className="min-w-0 flex-1 truncate font-medium text-text-primary">{a.text}</span>
                <span className="shrink-0 text-xs text-text-tertiary">{new Date(a.at).toLocaleDateString("es-CL")} · <Link href="/workflows" className="font-bold text-brand-600 underline">workflows</Link></span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
