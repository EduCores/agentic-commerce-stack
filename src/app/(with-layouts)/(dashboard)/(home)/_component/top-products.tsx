"use client";

import { Package } from "lucide-react";
import { Badge } from "@/components/tailgrids/core/badge";
import { sharePct } from "@/utils/period-stats";
import { formatCLP, type HomeStats } from "./home-types";

/** Productos con más demanda: unidades, ingresos estimados y participación. */
export function TopProducts({ items }: { items: HomeStats["topProducts"] }) {
  const totalQty = items.reduce((a, tp) => a + (tp.quantity ?? 0), 0);
  return (
    <div className="min-w-0 rounded-xl border border-card-border bg-card-background p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-badge-sky-background text-badge-sky-text [&>svg]:size-4">
          <Package />
        </span>
        <div className="min-w-0">
          <h3 className="min-w-0 truncate text-sm font-semibold tracking-[-0.2px] text-text-primary">Productos con más demanda</h3>
          <p className="truncate text-xs text-text-tertiary">Unidades, ingresos y % del período</p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-text-tertiary">Sin ventas todavía</p>
        ) : (
          items.map((tp, i) => {
            const revenue = (tp.quantity ?? 0) * Number(tp.product?.price ?? 0);
            return (
              <div key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-text-primary">
                  {tp.product?.title ?? "—"} <span className="text-xs text-text-tertiary">{tp.product?.sku}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-bold text-text-primary">{formatCLP(revenue)}</span>
                  <Badge color={i === 0 ? "success" : i === 1 ? "warning" : "gray"}>{tp.quantity} uds · {sharePct(tp.quantity ?? 0, totalQty).toLocaleString("es-CL")}%</Badge>
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
