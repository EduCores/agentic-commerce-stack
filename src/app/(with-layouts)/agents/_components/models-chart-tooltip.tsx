"use client";

import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { displayModelName } from "@/utils/model-display";
import { sharePct } from "@/utils/period-stats";

type ModelTooltipData = {
  model: string;
  requests: number;
  cost: number;
  revenue: number;
};

type Props = Partial<TooltipContentProps<ValueType, NameType>> & {
  total: number;
};

export function ModelsChartTooltip({ active, payload, total }: Props) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload as ModelTooltipData | undefined;
  if (!data) return null;

  const margin = data.revenue - data.cost;
  const share = sharePct(data.requests, total);

  return (
    <div className="min-w-52 rounded-lg border border-card-border bg-dropdowns-background p-3 shadow-lg">
      <p className="font-semibold text-text-primary">{displayModelName(data.model)}</p>
      <p className="mt-0.5 truncate text-[11px] text-text-tertiary" title={data.model}>
        {data.model}
      </p>
      <div className="mt-3 space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-6">
          <span className="text-text-tertiary">Solicitudes</span>
          <span className="font-semibold text-text-primary">
            {data.requests.toLocaleString("es-CL")}
            <span className="ml-1 font-normal text-text-tertiary">({share.toLocaleString("es-CL")}%)</span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-text-tertiary">Costo</span>
          <span className="font-semibold text-text-primary">${data.cost.toLocaleString("es-CL")}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-text-tertiary">Ingresos</span>
          <span className="font-semibold text-emerald-600">${data.revenue.toLocaleString("es-CL")}</span>
        </div>
        <div className="flex items-center justify-between gap-6 border-t border-card-border pt-1.5">
          <span className="text-text-tertiary">Margen estimado</span>
          <span className="font-semibold text-emerald-600">${margin.toLocaleString("es-CL")}</span>
        </div>
      </div>
    </div>
  );
}
