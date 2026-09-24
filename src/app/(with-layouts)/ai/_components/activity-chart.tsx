"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChartContainer, ChartTooltipContent } from "@/components/tailgrids/core/chart";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";
import {
  Select,
  SelectContent,
  SelectIndicator,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/tailgrids/core/select";
import type { AiStats, AiRange } from "./types";
import { AI_RANGES } from "./types";
import { halfDelta } from "@/utils/period-stats";
import { DeltaChip } from "@/components/common/stat-helpers";

const MONTHS = [
  { id: "all", label: "Todos" },
  { id: "1", label: "Enero" },
  { id: "2", label: "Febrero" },
  { id: "3", label: "Marzo" },
  { id: "4", label: "Abril" },
  { id: "5", label: "Mayo" },
  { id: "6", label: "Junio" },
  { id: "7", label: "Julio" },
  { id: "8", label: "Agosto" },
  { id: "9", label: "Septiembre" },
  { id: "10", label: "Octubre" },
  { id: "11", label: "Noviembre" },
  { id: "12", label: "Diciembre" },
] as const;

const YEARS = ["all", "2024", "2025", "2026"] as const;

type Props = {
  data: AiStats | null;
  days: AiRange;
  onDays: (d: AiRange) => void;
  month: string;
  year: string;
  onMonth: (v: string) => void;
  onYear: (v: string) => void;
};

export function AiActivityChart({ data, days, onDays, month, year, onMonth, onYear }: Props) {
  const rows = data?.byDay ?? [];
  const total = rows.reduce((a, r) => a + r.requests, 0);
  const avg = rows.length > 0 ? Math.round(total / rows.length) : 0;
  const peak = rows.length > 0 ? rows.reduce((a, b) => (b.requests > a.requests ? b : a), rows[0]) : null;
  const step = Math.max(1, Math.ceil(rows.length / 7));

  // Si hoy (último día) tiene 0 y es el día actual, ponemos un placeholder mínimo
  const todayStr = new Date().toISOString().slice(5, 10);
  const chartRows: ({ day: string; requests: number } & { isProjected?: boolean })[] = rows.map((r, i) => {
    if (i === rows.length - 1 && r.day === todayStr && r.requests === 0) {
      const maxPrev = Math.max(...rows.slice(0, -1).map((x) => x.requests), 1);
      return { ...r, requests: Math.max(1, Math.round(maxPrev * 0.15)), isProjected: true };
    }
    return r;
  });

  const { delta, direction } = halfDelta(rows.map((r) => r.requests));

  const monthLabel = MONTHS.find((m) => m.id === month)?.label ?? "Todos";
  const yearLabel = year === "all" ? "" : year;
  const titleSuffix =
    month !== "all" && year !== "all"
      ? `${monthLabel} ${yearLabel}`
      : month !== "all"
        ? monthLabel
        : year !== "all"
          ? yearLabel
          : `últimos ${days} días`;

  return (
    <Card className="min-w-0 md:col-span-3 overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm">Actividad de AI — {titleSuffix}</CardTitle>
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
          <BarChart data={chartRows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <defs>
              <pattern id="today-pattern" patternUnits="userSpaceOnUse" width="4" height="4">
                <path d="M0,4 l4,-4 M-1,1 l2,-2 M3,5 l2,-2" stroke="#5750F1" strokeWidth="1" fill="none" strokeOpacity="0.4" />
              </pattern>
            </defs>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} interval={step - 1} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "var(--color-card-border)", opacity: 0.15 }}
              content={<ChartTooltipContent labelFormatter={(v) => `Día ${v}`} />}
            />
            <Bar dataKey="requests" name="Solicitudes" radius={[6, 6, 0, 0]}>
              {chartRows.map((r, i) => (
                <Cell key={i} fill={r.isProjected ? "url(#today-pattern)" : i === chartRows.length - 1 ? "#5750F1" : "#C7D2FE"} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pt-3 text-xs text-text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          Solicitudes <DeltaChip delta={delta} direction={direction} />
        </span>
        <span>vs mitad anterior</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-card-border px-3 py-3">
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
        <div className="ml-auto flex items-center gap-2">
          <Select value={month} onChange={(v) => onMonth(String(v))} aria-label="Filtrar por mes">
            <SelectTrigger className="h-8 min-w-28 text-xs">
              <SelectValue />
              <SelectIndicator />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.id} id={m.id} textValue={m.label}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onChange={(v) => onYear(String(v))} aria-label="Filtrar por año">
            <SelectTrigger className="h-8 min-w-20 text-xs">
              <SelectValue />
              <SelectIndicator />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} id={y} textValue={y === "all" ? "Año" : y}>
                  {y === "all" ? "Año" : y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="hidden items-center gap-2 text-xs text-text-tertiary sm:flex">
            <span className="flex items-center gap-1.5">
              <div className="size-2 rounded" style={{ background: "url(#today-pattern)" }} />
              Hoy (proyectado)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#5750F1]" /> Hoy real
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#C7D2FE]" /> Previos
            </span>
          </span>
        </div>
      </div>
    </Card>
  );
}
