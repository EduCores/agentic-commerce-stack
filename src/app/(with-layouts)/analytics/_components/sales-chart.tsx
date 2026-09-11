"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChartContainer, ChartTooltipContent } from "@/components/tailgrids/core/chart";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalyticsData } from "./types";

export function AnalyticsSalesChart({ data }: { data: AnalyticsData | null }) {
  const rows = data?.salesByDay ?? [];
  return (
    <Card className="min-w-0 md:col-span-2">
      <CardHeader><CardTitle className="text-sm">Analítica de visitas — ventas de los últimos 7 días</CardTitle></CardHeader>
      <CardContent className="h-72 p-0">
        <ChartContainer className="h-full w-full" height="100%" width="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <defs>
              <linearGradient id="analytics-sales-bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5750F1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#5750F1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }} />
            <Tooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="total" name="Ventas" stroke="#5750F1" strokeWidth={2} fill="url(#analytics-sales-bg)" dot={false} />
            <Area type="monotone" dataKey="orders" name="Pedidos" stroke="#D8B4FE" strokeWidth={2} fill="transparent" dot={false} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
