"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Bot, Workflow } from "lucide-react";
import { Badge } from "@/components/tailgrids/core/badge";
import { HomeCardLink } from "./home-card-link";
import { activityStatus } from "./home-ops-card";

type CrmData = {
  recentActivities: { id: string; text: string; at: string; kind?: string }[];
};

/** Punto "en vivo" con pulso (igual que las tarjetas vecinas). */
function LiveDot({ color = "bg-emerald-500" }: { color?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-text-tertiary">
      <span className="relative flex size-2">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-60`} />
        <span className={`relative inline-flex size-2 rounded-full ${color}`} />
      </span>
      en vivo
    </span>
  );
}

/** Actividad reciente: últimos pasos de agentes (IA) y flujos automáticos. */
export function HomeActivityCard() {
  // Misma queryKey que Operación: comparte caché, sin fetch extra.
  const { data } = useQuery<CrmData>({
    queryKey: ["home-ops"],
    queryFn: async () => (await fetch("/api/crm")).json(),
    refetchInterval: 60000,
  });

  const items = (data?.recentActivities ?? []).slice(0, 4);

  return (
    <div className="min-w-0 rounded-xl border border-card-border bg-card-background p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-badge-sky-background text-badge-sky-text [&>svg]:size-4.5">
            <Activity />
          </span>
          <p className="min-w-0 truncate text-sm font-medium text-text-secondary">Actividad reciente</p>
        </div>
        <LiveDot />
      </div>
      <p className="mt-2 text-xs text-text-tertiary">Últimos pasos ejecutados por tus agentes (IA) y flujos automáticos</p>
      <div className="mt-3 space-y-1.5">
        {items.length === 0 ? (
          <p className="text-xs text-text-tertiary">Sin actividad todavía.</p>
        ) : (
          items.map((a) => {
            const isWorkflow = a.text.includes("→");
            const mainText = isWorkflow ? a.text.split("→")[0].trim() : a.text;
            const status = activityStatus(a.text, a.kind);
            return (
              <div
                key={a.id}
                className="flex items-center gap-2.5 rounded-lg border border-card-border/60 bg-background-gray-secondary_alt/40 px-3 py-2"
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                    a.kind === "agent" || !isWorkflow
                      ? "bg-badge-violet-background text-badge-violet-text"
                      : "bg-badge-sky-background text-badge-sky-text"
                  }`}
                >
                  {a.kind === "agent" || !isWorkflow ? <Bot className="size-4" /> : <Workflow className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-text-primary" title={a.text}>{mainText}</p>
                  <p className="text-[11px] text-text-tertiary">{new Date(a.at).toLocaleDateString("es-CL")}</p>
                </div>
                <Badge color={status.color} size="sm">{status.label}</Badge>
              </div>
            );
          })
        )}
      </div>
      <HomeCardLink href="/workflows">Ver flujos →</HomeCardLink>
    </div>
  );
}
