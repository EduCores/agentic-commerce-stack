"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Filter } from "lucide-react";
import { Badge } from "@/components/tailgrids/core/badge";

type FunnelRow = { stage: string; value: number };

const COLORS = ["#5750F1", "#8B5CF6", "#22C55E", "#F59E0B", "#06B6D4"];

export function HomeFunnelCard() {
  const { data } = useQuery<{ funnel: FunnelRow[] }>({
    queryKey: ["home-funnel"],
    queryFn: async () => (await fetch("/api/marketing")).json(),
    refetchInterval: 60000,
  });

  const rows = data?.funnel ?? [];
  const first = rows[0]?.value || 1;
  const last = rows[rows.length - 1]?.value || 0;
  const totalConv = Math.round((last / first) * 1000) / 10;

  return (
    <div className="rounded-xl border border-card-border bg-card-background p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-badge-violet-background text-badge-violet-text [&>svg]:size-4.5">
            <Filter />
          </span>
          <h3 className="text-sm font-semibold tracking-[-0.2px] text-text-primary">Embudo de conversión</h3>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-text-tertiary">Sin datos aún.</p>
      ) : (
        <>
          <div className="mt-4 space-y-2.5">
            {rows.map((r, i) => {
              const pct = Math.round((r.value / first) * 100);
              const prev = i > 0 ? rows[i - 1].value : null;
              const stepConv = prev ? Math.round((r.value / prev) * 1000) / 10 : null;
              return (
                <div key={r.stage} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-text-secondary">
                      <span className="size-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {r.stage}
                    </span>
                    <span className="font-bold text-text-primary">
                      {r.value.toLocaleString("es-CL")} <span className="font-medium text-text-tertiary">· {pct}%</span>
                      {stepConv !== null && <span className="ml-1 font-medium text-emerald-600">↘ {stepConv}%</span>}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-background-gray-secondary">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <Badge color="primary" className="whitespace-nowrap">{totalConv}% conversión total</Badge>
            <Link href="/marketing" className="text-xs font-bold text-brand-600 hover:underline">
              Ver marketing →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
