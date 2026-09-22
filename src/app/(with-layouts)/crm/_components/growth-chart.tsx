"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChartContainer } from "@/components/tailgrids/core/chart";
import {
  Select,
  SelectContent,
  SelectIndicator,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/tailgrids/core/select";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { GrowthTooltip } from "./growth-tooltip";
import type { CrmData, CrmRange } from "./types";
import { CRM_RANGES } from "./types";

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
  data: CrmData | null;
  days: CrmRange;
  onDays: (d: CrmRange) => void;
  month: string;
  year: string;
  onMonth: (v: string) => void;
  onYear: (v: string) => void;
};

export function CrmGrowthChart({ data, days, onDays, month, year, onMonth, onYear }: Props) {
  const rows = data?.growth ?? [];
  const newLeads = rows.reduce((a, r) => a + r.leads, 0);
  const revenue = rows.reduce((a, r) => a + (r.revenue ?? 0), 0);
  const step = Math.max(1, Math.ceil(rows.length / 7));

  const monthLabel = MONTHS.find((m) => m.id === month)?.label ?? "Mes";
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
    <Card className="min-w-0 md:col-span-3">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Crecimiento de clientes — {titleSuffix}</CardTitle>
          <p className="text-xs font-bold text-text-primary">
            +{newLeads} <span className="font-medium text-text-tertiary">clientes ·</span> ${revenue.toLocaleString("es-CL")}{" "}
            <span className="font-medium text-text-tertiary">ingresos</span>
          </p>
        </div>
      </CardHeader>
      <CardContent className="h-64 p-0">
        <ChartContainer className="h-full w-full" height="100%" width="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 0, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <defs>
              <linearGradient id="crm-growth-bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="crm-revenue-bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: string) => v.slice(5)}
              interval={step - 1}
            />
            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} width={30} />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)} mil` : `${v}`)}
              width={48}
            />
            <Tooltip content={<GrowthTooltip />} />
            <Area yAxisId="left" type="monotone" dataKey="leads" name="Clientes nuevos" stroke="#22C55E" strokeWidth={2} fill="url(#crm-growth-bg)" dot={false} />
            <Area yAxisId="right" type="monotone" dataKey="revenue" name="Ingresos ($)" stroke="#8B5CF6" strokeWidth={2} fill="url(#crm-revenue-bg)" dot={false} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <div className="flex flex-wrap items-center gap-2 border-t border-card-border px-5 py-3">
        <span className="text-xs text-text-tertiary">Rango:</span>
        {CRM_RANGES.map((r) => (
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
            <span className="size-2.5 rounded-full" style={{ backgroundColor: "#22C55E" }} aria-hidden="true" />
            Clientes nuevos (n°)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: "#8B5CF6" }} aria-hidden="true" />
            Ingresos ($)
          </span>
        </span>
      </div>
    </Card>
  );
}
