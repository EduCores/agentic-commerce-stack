"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/tailgrids/core/card";
import { AnalyticsSalesChart } from "./sales-chart";
import { AnalyticsStatusChart, AnalyticsSourceChart } from "./breakdown";
import { AnalyticsTopContent } from "./top-content";
import { AnalyticsInsights } from "./analytics-insights";
import type { AnalyticsData, AnalyticsRange } from "./types";
import { ANALYTICS_RANGES } from "./types";
import Link from "next/link";
import { Cart2, Wallet2 } from "@tailgrids/icons";
import { ShoppingBag, TrendingUp, ReceiptText, BadgeCheck } from "lucide-react";

function formatCLP(n: number): string {
  return `$${n.toLocaleString("es-CL")}`;
}

export function AnalyticsDashboard() {
  const [days, setDays] = useState<AnalyticsRange>(21);
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["analytics", days, month, year],
    queryFn: async () => {
      const params = new URLSearchParams({ days: String(days) });
      if (month !== "all") params.set("month", month);
      if (year !== "all") params.set("year", year);
      const r = await fetch(`/api/analytics?${params}`);
      return r.json();
    },
  });

  if (isLoading) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Cargando analítica...</CardContent></Card>;
  if (!data) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Sin datos</CardContent></Card>;

  const periodLabel =
    month !== "all" && year !== "all"
      ? `mes ${month}/${year}`
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
            <h3 className="mt-2.5 flex items-center gap-2 text-sm font-bold tracking-[-0.2px]">
              <span className="flex size-7 items-center justify-center rounded-lg bg-white/15 text-white [&>svg]:size-4">
                <TrendingUp />
              </span>
              Tendencias reales de tu tienda
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <a href="/api/analytics?format=csv" download className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur hover:bg-white/20">
              Exportar CSV
            </a>
            <Link href="/orders" className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur hover:bg-white/25">
              Ver /orders →
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 [&>svg]:size-4">
                <ShoppingBag />
              </span>
              <p className="text-xs font-medium text-white/80">Pedidos totales</p>
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight">{data.totals.orders.toLocaleString("es-CL")}</p>
            <p className="text-xs text-white/70">promedio {Math.round(data.totals.orders / Math.max(1, (month !== "all" || year !== "all" ? 30 : days))) || data.totals.orders} por día</p>
          </div>
          <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 [&>svg]:size-4">
                <Wallet2 />
              </span>
              <p className="text-xs font-medium text-white/80">Ingresos</p>
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight">{formatCLP(data.totals.revenue)}</p>
            <p className="text-xs text-white/70">ingresos del período {periodLabel}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 [&>svg]:size-4">
                <ReceiptText />
              </span>
              <p className="text-xs font-medium text-white/80">Ticket promedio</p>
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight">{formatCLP(data.totals.avgOrder)}</p>
            <p className="text-xs text-white/70">por pedido · ingresos / pedidos</p>
          </div>
          <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 [&>svg]:size-4">
                <BadgeCheck />
              </span>
              <p className="text-xs font-medium text-white/80">Conversión a pago</p>
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight">{data.totals.conversion}%</p>
            <p className="text-xs text-white/70">pedidos pagados + completados</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/15 pt-4">
          <span className="flex items-center gap-1.5 text-xs font-medium text-white/80">
            <TrendingUp className="size-3.5" /> Mejor día:
          </span>
          <span className="rounded-[4px] bg-white/15 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
            {data.totals.bestDay ? `${data.totals.bestDay.date} — ${formatCLP(data.totals.bestDay.total)} (${data.totals.bestDay.orders} pedidos)` : "sin datos"}
          </span>
          <span className="text-xs text-white/60">· Datos reales de {periodLabel} · cierre diario</span>
        </div>
      </div>

      <AnalyticsSalesChart data={data} days={days} onDays={setDays} month={month} year={year} onMonth={setMonth} onYear={setYear} />

      <div className="grid gap-4 md:col-span-3 md:grid-cols-10">
        <AnalyticsStatusChart data={data} className="min-w-0 md:col-span-7" />
        <AnalyticsSourceChart data={data} className="min-w-0 md:col-span-3" />
      </div>

      <AnalyticsTopContent data={data} />

      <AnalyticsInsights data={data} />
    </div>
  );
}