"use client";

import { Badge } from "@/components/tailgrids/core/badge";
import type { HomeStats } from "./home-types";

/** Productos con más demanda (colorido). */
export function TopProducts({ items }: { items: HomeStats["topProducts"] }) {
  return (
    <div className="rounded-xl border border-card-border bg-card-background p-5">
      <div className="h-1.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-500" />
      <h3 className="mt-3 text-sm font-semibold tracking-[-0.2px] text-text-primary">Productos con más demanda</h3>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-text-tertiary">Sin ventas todavía</p>
        ) : (
          items.map((tp, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-text-primary">
                {tp.product?.title ?? "—"} <span className="text-xs text-text-tertiary">{tp.product?.sku}</span>
              </span>
              <Badge color={i === 0 ? "primary" : "gray"}>{tp.quantity} uds</Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
