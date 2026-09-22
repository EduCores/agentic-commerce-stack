"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChartContainer, ChartTooltipContent } from "@/components/tailgrids/core/chart";
import {
  Select,
  SelectContent,
  SelectIndicator,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/tailgrids/core/select";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalyticsData, AnalyticsRange } from "./types";
import { ANALYTICS_RANGES } from "./types";

const MONTHS = [
  { id: "all", label: "Mes" },
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
  data: AnalyticsData | null;
  days: AnalyticsRange;
  onDays: (d: AnalyticsRange) => void;
  month: string;
  year: string;
  onMonth: (v: string) => void;
  onYear: (v: string) => void;
};

export function AnalyticsSalesChart({ data, days, onDays, month, year, onMonth, onYear }: Props) {
  const rows = data?.salesByDay ?? [];
  const step = Math.max(1, Math.ceil(rows.length / 7));

  return (
    <Card className="min-w-0 md:col-span-3">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Analítica de visitas — ventas en el período</CardTitle>
          <p className="text-xs text-text-tertiary">
            Total:{" "}
            <span className="font-bold text-brand-600">
              ${rows.reduce((a, r) => a + r.total, 0).toLocaleString("es-CL")}
            </span>{" "}
            · {rows.length} días
          </p>
        </div>
        <p className="text-xs text-text-tertiary">Ventas en $ y pedidos · rango de días o filtra por mes/año</p>
      </CardHeader>
      <CardContent className="h-72 p-0">
        <ChartContainer className="h-full w-full" height="100%" width="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} interval={step - 1} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)} mil` : `${v}`)}
              width={44}
            />
            <Tooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="total" name="Ventas" stroke="#00cf2f" strokeWidth={2} fill="#00cf2f" fillOpacity={0.3} dot={false} />
            <Area type="monotone" dataKey="orders" name="Pedidos" stroke="#00cf2f" strokeWidth={2} strokeDasharray="4 4" fill="transparent" dot={false} />
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
        <div className="ml-auto flex items-center gap-2">
          <Select value={month} onChange={(v) => onMonth(String(v))} aria-label="Filtrar por mes">
            <SelectTrigger className="h-8 min-w-24 text-xs">
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
        </div>
        <span className="mt-3 flex w-full items-center justify-between gap-3 text-xs text-text-secondary sm:mt-0 sm:w-auto">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: "#00cf2f" }} aria-hidden="true" />
            Ventas ($)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: "#00cf2f" }} aria-hidden="true" />
            Pedidos (n°)
          </span>
        </span>
      </div>
    </Card>
  );
}
