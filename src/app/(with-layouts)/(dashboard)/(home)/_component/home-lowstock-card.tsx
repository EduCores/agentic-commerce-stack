"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/tailgrids/core/badge";
import { TriangleAlert } from "lucide-react";

type LowStock = { title: string; sku: string; stock: number };

export function HomeLowStockCard() {
  const { data } = useQuery<{ lowStock: LowStock[] }>({
    queryKey: ["home-lowstock"],
    queryFn: async () => (await fetch("/api/analytics")).json(),
    refetchInterval: 60000,
  });

  const items = (data?.lowStock ?? []).slice(0, 5);

  return (
    <div className="rounded-xl border border-card-border bg-card-background p-5">
      <div className="h-1.5 rounded-full bg-gradient-to-r from-teal-400 to-[#328e8f]" />
      <div className="mt-3 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/30 [&>svg]:size-4">
          <TriangleAlert />
        </span>
        <h3 className="text-sm font-semibold tracking-[-0.2px] text-text-primary">Stock crítico — reponer</h3>
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
              <Badge color={p.stock <= 3 ? "error" : p.stock < 10 ? "warning" : "gray"}>{p.stock} uds</Badge>
            </div>
          ))
        )}
      </div>
      <Link href="/products" className="mt-3 inline-block text-xs font-bold text-brand-600 hover:underline">
        Gestionar stock →
      </Link>
    </div>
  );
}
