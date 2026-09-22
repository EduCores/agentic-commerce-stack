"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/tailgrids/core/card";
import { AnalyticsSalesChart } from "./sales-chart";
import { AnalyticsStatusChart, AnalyticsSourceChart } from "./breakdown";
import { AnalyticsTopContent } from "./top-content";
import type { AnalyticsData, AnalyticsRange } from "./types";
import Link from "next/link";
import { Cart2, Wallet2 } from "@tailgrids/icons";

export function AnalyticsDashboard() {
  const [days, setDays] = useState<AnalyticsRange>(7);
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["analytics", days],
    queryFn: async () => {
      const r = await fetch(`/api/analytics?days=${days}`);
      return r.json();
    },
  });

  if (isLoading) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Cargando analítica...</CardContent></Card>;
  if (!data) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Sin datos</CardContent></Card>;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 to-primary-500 p-6 text-white md:col-span-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-white/20 [&>svg]:size-4.5">
                <Cart2 />
              </span>
              <p className="text-sm font-medium text-white/90">Pedidos totales</p>
            </div>
            <p className="mt-2 text-4xl font-extrabold tracking-tight">{data.totals.orders.toLocaleString("es-CL")}</p>
          </div>
          <div className="hidden w-px self-stretch bg-white/20 sm:block" />
          <div className="sm:text-right">
            <div className="flex items-center gap-2.5 sm:justify-end">
              <span className="flex size-9 items-center justify-center rounded-lg bg-white/20 [&>svg]:size-4.5">
                <Wallet2 />
              </span>
              <p className="text-sm font-medium text-white/90">Ingresos</p>
            </div>
            <p className="mt-2 text-4xl font-extrabold tracking-tight">${data.totals.revenue.toLocaleString("es-CL")}</p>
          </div>
        </div>
        <Link href="/orders" className="mt-4 inline-block text-xs font-medium text-white/90 underline">Ver /orders</Link>
      </div>
      <AnalyticsSalesChart data={data} days={days} onDays={setDays} />
      <div className="grid gap-4 md:col-span-3 md:grid-cols-10">
        <AnalyticsStatusChart data={data} className="min-w-0 md:col-span-7" />
        <AnalyticsSourceChart data={data} className="min-w-0 md:col-span-3" />
      </div>
      <AnalyticsTopContent data={data} />
    </div>
  );
}
