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
  const avg = rows.length > 0 ? Math.round(total / rows.length) : 0;
  const peak = rows.length > 0 ? rows.reduce((a, b) => (b.requests > a.requests ? b : a), rows[0]) : null;
  const step = Math.max(1, Math.ceil(rows.length / 7));

  return (
    <Card className="min-w-0 md:col-span-3 overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm">Actividad de AI — últimos {days} días</CardTitle>
            <p className="mt-1 text-xs text-text-tertiary">
              {total.toLocaleString("es-CL")} solicitudes · {avg}/día promedio
              {peak ? ` · pico ${peak.day} con ${peak.requests}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-badge-primary-background px-2.5 py-1 text-xs font-bold text-badge-primary-text">
              {total} en período
            </span>
            <span className="rounded-full bg-background-gray-secondary px-2.5 py-1 text-xs font-medium text-text-tertiary">
              ~${(total * 0.9).toFixed(1)} costo estimado
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-72 p-0">
        <ChartContainer className="h-full w-full" height="100%" width="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} interval={step - 1} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "var(--color-card-border)", opacity: 0.15 }}
              content={<ChartTooltipContent labelFormatter={(v) => `Día ${v}`} />}
            />
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
        <span className="ml-auto hidden items-center gap-2 text-xs text-text-tertiary sm:flex">
          <span className="size-2 rounded-full bg-[#5750F1]" /> Hoy
          <span className="size-2 rounded-full bg-[#C7D2FE]" /> Días previos
        </span>
      </div>
    </Card>
  );
}
