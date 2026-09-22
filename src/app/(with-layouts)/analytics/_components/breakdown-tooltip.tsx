"use client";

import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

type Props = Partial<TooltipContentProps<ValueType, NameType>> & {
  totalOrders: number;
  nameFor?: (raw: string) => string;
};

/** Tooltip con info atingente: pedidos, % del total e ingresos del grupo. */
export function BreakdownTooltip({ active, payload, label, totalOrders, nameFor }: Props) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload as { count: number; revenue: number; status?: string; source?: string };
  const raw = d.status ?? d.source ?? String(label ?? "");
  const name = nameFor ? nameFor(raw) : raw;
  const share = totalOrders > 0 ? Math.round((d.count / totalOrders) * 1000) / 10 : 0;

  return (
    <div className="rounded-lg border border-card-border bg-dropdowns-background p-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-text-primary">{name}</p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between gap-6">
          <span className="text-text-tertiary">Pedidos</span>
          <span className="font-semibold text-text-primary">
            {d.count} <span className="font-medium text-text-tertiary">({share.toLocaleString("es-CL")}%)</span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-text-tertiary">Ingresos</span>
          <span className="font-semibold text-brand-600">${Number(d.revenue ?? 0).toLocaleString("es-CL")}</span>
        </div>
      </div>
    </div>
  );
}
