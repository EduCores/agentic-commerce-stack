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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-4 rounded-xl bg-white/10 p-5 backdrop-blur">
            <div>
              <p className="text-sm font-medium text-white/80">Pedidos totales</p>
              <p className="mt-1 text-4xl font-extrabold tracking-tight">{data.totals.orders.toLocaleString("es-CL")}</p>
            </div>
            <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-white/15 [&>svg]:size-9">
              <Cart2 />
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-white/10 p-5 backdrop-blur">
            <div>
              <p className="text-sm font-medium text-white/80">Ingresos</p>
              <p className="mt-1 text-4xl font-extrabold tracking-tight">${data.totals.revenue.toLocaleString("es-CL")}</p>
            </div>
            <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-white/15 [&>svg]:size-9">
              <Wallet2 />
            </span>
          </div>
        </div>
        <Link href="/orders" className="mt-4 inline-block text-xs font-medium text-white/90 underline">Ver /orders →</Link>
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
