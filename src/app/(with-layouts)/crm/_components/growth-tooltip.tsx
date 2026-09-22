"use client";

import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

type Props = Partial<TooltipContentProps<ValueType, NameType>>;

/** Tooltip claro del crecimiento: fecha, clientes nuevos e ingresos del día. */
export function GrowthTooltip({ active, payload, label }: Props) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload as { day: string; leads: number; revenue: number };
  const rawDay = typeof label === "string" ? label : d.day;
  const pretty = new Date(`${rawDay}T12:00:00`).toLocaleDateString("es-CL", { day: "numeric", month: "short" });

  return (
    <div className="rounded-lg border border-card-border bg-dropdowns-background p-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-text-primary capitalize">{pretty}</p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-text-tertiary">
            <span className="size-2 rounded-full" style={{ backgroundColor: "#22C55E" }} aria-hidden="true" />
            Clientes nuevos
          </span>
          <span className="font-semibold text-text-primary">{d.leads}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-text-tertiary">
            <span className="size-2 rounded-full" style={{ backgroundColor: "#8B5CF6" }} aria-hidden="true" />
            Ingresos
          </span>
          <span className="font-semibold text-brand-600">${Number(d.revenue ?? 0).toLocaleString("es-CL")}</span>
        </div>
      </div>
    </div>
  );
}
