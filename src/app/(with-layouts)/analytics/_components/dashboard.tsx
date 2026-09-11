"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/tailgrids/core/card";
import { AnalyticsSalesChart } from "./sales-chart";
import { AnalyticsBreakdown } from "./breakdown";
import { AnalyticsTopContent } from "./top-content";
import type { AnalyticsData } from "./types";
import Link from "next/link";

export function AnalyticsDashboard() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: async () => {
      const r = await fetch("/api/analytics");
      return r.json();
    },
  });

  if (isLoading) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Cargando analítica...</CardContent></Card>;
  if (!data) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Sin datos</CardContent></Card>;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <AnalyticsSalesChart data={data} />
      <Card>
        <CardContent className="space-y-1 p-6">
          <p className="text-xs text-text-tertiary">Pedidos totales</p>
          <p className="text-2xl font-bold">{data.totals.orders}</p>
          <p className="text-xs text-text-tertiary">Ingresos ${data.totals.revenue.toLocaleString("es-CL")}</p>
          <Link href="/orders" className="text-xs font-medium text-brand-600 underline">Ver /orders</Link>
        </CardContent>
      </Card>
      <AnalyticsBreakdown data={data} />
      <AnalyticsTopContent data={data} />
    </div>
  );
}
