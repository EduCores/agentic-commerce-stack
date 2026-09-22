"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChartContainer, ChartTooltipContent } from "@/components/tailgrids/core/chart";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalyticsData, AnalyticsRange } from "./types";
import { ANALYTICS_RANGES } from "./types";

type Props = {
  data: AnalyticsData | null;
  days: AnalyticsRange;
  onDays: (d: AnalyticsRange) => void;
};

export function AnalyticsSalesChart({ data, days, onDays }: Props) {
  const rows = data?.salesByDay ?? [];
  const step = Math.max(1, Math.ceil(rows.length / 7));

  return (
    <Card className="min-w-0 md:col-span-2">
      <CardHeader><CardTitle className="text-sm">Analítica de visitas — ventas de los últimos {days} días</CardTitle></CardHeader>
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
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} interval={step - 1} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }} />
            <Tooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="total" name="Ventas" stroke="#5750F1" strokeWidth={2} fill="url(#analytics-sales-bg)" dot={false} />
            <Area type="monotone" dataKey="orders" name="Pedidos" stroke="#D8B4FE" strokeWidth={2} fill="transparent" dot={false} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <div className="flex flex-wrap items-center gap-2 border-t border-card-border px-5 py-3">
        <span className="text-xs text-text-tertiary">Rango:</span>
        {ANALYTICS_RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onDays(r)}
            aria-pressed={days === r}
            className={
              days === r
                ? "rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-bold text-black"
                : "rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-brand-500 hover:text-text-primary"
            }
          >
            {r} días
          </button>
        ))}
      </div>
    </Card>
  );
}
