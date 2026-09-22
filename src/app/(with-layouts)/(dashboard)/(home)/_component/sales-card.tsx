"use client";

import { TrendUp2 } from "@tailgrids/icons";
import { SALES_RANGES, formatCLP, type SalesRange } from "./home-types";

type Props = {
  sales: { date: string; total: number }[];
  days: SalesRange;
  onDays: (d: SalesRange) => void;
};

/** Ventas a lo ancho (100%) con selector de rango debajo, al estilo del sitio. */
export function SalesCard({ sales, days, onDays }: Props) {
  const max = Math.max(...sales.map((x) => x.total), 1);
  const total = sales.reduce((a, x) => a + x.total, 0);
  const step = Math.max(1, Math.ceil(sales.length / 7));

  return (
    <div className="rounded-xl border border-card-border bg-card-background p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-badge-primary-background text-badge-primary-text [&>svg]:size-4.5">
            <TrendUp2 />
          </span>
          <h3 className="text-sm font-semibold tracking-[-0.2px] text-text-primary">
            Ventas de los últimos {days} días
          </h3>
        </div>
        <p className="text-sm font-bold text-text-primary">
          Total período: <span className="text-brand-600">{formatCLP(total)}</span>
        </p>
      </div>

      <div className="mt-4 flex h-28 items-end gap-1">
        {sales.map((d, i) => {
          const h = Math.max(3, Math.round((d.total / max) * 100));
          return (
            <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.date}: ${formatCLP(d.total)}`}>
              <div
                className="w-full rounded-t bg-gradient-to-t from-brand-500 to-amber-300"
                style={{ height: `${h}%` }}
              />
              {i % step === 0 && <span className="text-[10px] text-text-tertiary">{d.date.slice(5)}</span>}
            </div>
          );
        })}
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
      </div>
    </div>
  );
}
