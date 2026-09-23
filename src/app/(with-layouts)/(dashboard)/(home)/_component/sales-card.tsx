"use client";

import { TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectIndicator,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/tailgrids/core/select";
import { SALES_RANGES, formatCLP, type SalesRange } from "./home-types";

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
  sales: { date: string; total: number }[];
  days: SalesRange;
  onDays: (d: SalesRange) => void;
  month: string;
  year: string;
  onMonth: (v: string) => void;
  onYear: (v: string) => void;
};

/** Ventas a lo ancho (100%) con selector de rango debajo, al estilo del sitio. */
export function SalesCard({ sales, days, onDays, month, year, onMonth, onYear }: Props) {
  const max = Math.max(...sales.map((x) => x.total), 1);
  const total = sales.reduce((a, x) => a + x.total, 0);
  // Eje de fechas aparte (máx ~8 etiquetas): nunca colisionan aunque crezcan los días.
  const step = Math.max(1, Math.ceil(sales.length / 7));
  const ticks = sales.filter((_, i) => i % step === 0);
  const last = sales[sales.length - 1];
  if (last && ticks[ticks.length - 1]?.date !== last.date) ticks.push(last);

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-card-border bg-card-background p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-badge-primary-background text-badge-primary-text [&>svg]:size-4.5">
            <TrendingUp />
          </span>
          <h3 className="min-w-0 truncate text-sm font-semibold tracking-[-0.2px] text-text-primary">
            Ventas de los últimos {days} días
          </h3>
        </div>
        <p className="text-sm font-bold text-text-primary">
          Total período: <span className="text-brand-600">{formatCLP(total)}</span>
        </p>
      </div>

      <div className="mt-4 flex h-28 min-w-0 items-end gap-1">
        {sales.map((d) => {
          const h = Math.max(3, Math.round((d.total / max) * 100));
          return (
            <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${d.date}: ${formatCLP(d.total)}`}>
              {/* Barras: verde sólido (#00cf2f) con la clase especial .sales-bar-solid — sin gradiente. */}
              <div
                className="sales-bar-solid w-full rounded-t"
                style={{ height: `${h}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex min-w-0 items-center justify-between gap-1 overflow-hidden">
        {ticks.map((d) => (
          <span key={d.date} className="text-[10px] whitespace-nowrap text-text-tertiary">{d.date.slice(5)}</span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-card-border pt-4">
        <span className="text-xs text-text-tertiary">Rango:</span>
        {SALES_RANGES.map((r) => (
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
      </div>
    </div>
  );
}
