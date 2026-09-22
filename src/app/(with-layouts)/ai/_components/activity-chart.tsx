"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChartContainer, ChartTooltipContent } from "@/components/tailgrids/core/chart";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";
import type { AiStats, AiRange } from "./types";
import { AI_RANGES } from "./types";

type Props = {
  data: AiStats | null;
  days: AiRange;
  onDays: (d: AiRange) => void;
};

export function AiActivityChart({ data, days, onDays }: Props) {
  const rows = data?.byDay ?? [];
  const total = rows.reduce((a, r) => a + r.requests, 0);
  const step = Math.max(1, Math.ceil(rows.length / 7));

  return (
    <Card className="min-w-0 md:col-span-2">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Actividad de AI — últimos {days} días</CardTitle>
          <p className="text-xs font-bold text-text-primary">
            {total} <span className="font-medium text-text-tertiary">solicitudes</span>
          </p>
        </div>
      </CardHeader>
      <CardContent className="h-64 p-0">
        <ChartContainer className="h-full w-full" height="100%" width="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} interval={step - 1} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={<ChartTooltipContent />} />
            <Bar dataKey="requests" name="Solicitudes" radius={[6, 6, 0, 0]}>
              {rows.map((_, i) => (
                <Cell key={i} fill={i === rows.length - 1 ? "#5750F1" : "#C7D2FE"} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <div className="flex flex-wrap items-center gap-2 border-t border-card-border px-5 py-3">
        <span className="text-xs text-text-tertiary">Rango:</span>
        {AI_RANGES.map((r) => (
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
