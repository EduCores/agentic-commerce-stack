"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/tailgrids/core/badge";

type Channel = { channel: string; revenue: number; convRate: number; count?: number };

export function HomeChannelsCard() {
  const { data } = useQuery<{ channels: Channel[] }>({
    queryKey: ["home-channels"],
    queryFn: async () => (await fetch("/api/marketing")).json(),
    refetchInterval: 60000,
  });

  const channels = (data?.channels ?? []).slice(0, 4);
  const best = [...channels].sort((a, b) => b.convRate - a.convRate)[0];

  return (
    <div className="rounded-xl border border-card-border bg-card-background p-5">
      <div className="h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500" />
      <h3 className="mt-3 text-sm font-semibold tracking-[-0.2px] text-text-primary">Canales que más convierten</h3>
      <p className="text-xs text-text-tertiary">Por donde entra el dinero hoy</p>
      <div className="mt-3 space-y-2">
        {channels.length === 0 ? (
          <p className="text-xs text-text-tertiary">Sin canales aún.</p>
        ) : (
          channels.map((c) => (
            <div key={c.channel} className="flex items-center justify-between gap-2 rounded-lg border border-card-border/60 px-3 py-2">
              <span className="text-sm font-medium text-text-primary">{c.channel}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs font-bold text-brand-600">${c.revenue.toLocaleString("es-CL")}</span>
                <Badge color={c.channel === best?.channel ? "success" : "gray"}>{c.convRate}%</Badge>
              </span>
            </div>
          ))
        )}
      </div>
      {best && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
          Mejor canal: <strong>{best.channel}</strong> con {best.convRate}% conversión
        </p>
      )}
      <Link href="/marketing" className="mt-3 inline-block text-xs font-bold text-brand-600 hover:underline">
        Ver canales →
      </Link>
    </div>
  );
}
