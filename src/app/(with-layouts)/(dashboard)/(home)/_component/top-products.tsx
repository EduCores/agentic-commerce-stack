"use client";

import { Package } from "lucide-react";
import { Badge } from "@/components/tailgrids/core/badge";
import type { HomeStats } from "./home-types";

/** Productos con más demanda (colorido). */
export function TopProducts({ items }: { items: HomeStats["topProducts"] }) {
  return (
    <div className="min-w-0 rounded-xl border border-card-border bg-card-background p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-badge-sky-background text-badge-sky-text [&>svg]:size-4">
          <Package />
        </span>
        <h3 className="min-w-0 truncate text-sm font-semibold tracking-[-0.2px] text-text-primary">Productos con más demanda</h3>
      </div>
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
