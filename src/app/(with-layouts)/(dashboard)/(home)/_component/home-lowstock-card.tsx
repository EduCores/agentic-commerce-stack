"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/tailgrids/core/badge";
import { TriangleAlert } from "lucide-react";
import { HomeCardLink } from "./home-card-link";

type LowStock = { title: string; sku: string; stock: number };

export function HomeLowStockCard() {
  const { data } = useQuery<{ lowStock: LowStock[] }>({
    queryKey: ["home-lowstock"],
    queryFn: async () => (await fetch("/api/analytics")).json(),
    refetchInterval: 60000,
    placeholderData: (prev) => prev,
  });

  const items = (data?.lowStock ?? []).slice(0, 5);

  return (
    <div className="min-w-0 rounded-xl border border-card-border bg-card-background p-5">
      <div className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/30 [&>svg]:size-4">
          <TriangleAlert />
        </span>
        <h3 className="min-w-0 truncate text-sm font-semibold tracking-[-0.2px] text-text-primary">Stock crítico — reponer</h3>
      </div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-text-tertiary">Todo el stock al día.</p>
        ) : (
          items.map((p) => (
            <div key={p.sku} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-text-primary">
                {p.title} <span className="text-xs text-text-tertiary">{p.sku}</span>
              </span>
              <Badge color={p.stock < 10 ? "error" : p.stock <= 30 ? "warning" : "success"}>{p.stock} uds</Badge>
            </div>
          ))
        )}
      </div>
      <HomeCardLink href="/products">Gestionar stock →</HomeCardLink>
    </div>
  );
}
