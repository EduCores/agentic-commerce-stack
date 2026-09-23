"use client";

import { useQuery } from "@tanstack/react-query";
import { ListChecks } from "lucide-react";
import { Badge } from "@/components/tailgrids/core/badge";
import { HomeCardLink } from "./home-card-link";

type CrmData = {
  tasks: { id: string; title: string; due: string; type: string }[];
  recentActivities: { id: string; text: string; at: string }[];
};

export function HomeOpsCard() {
  const { data } = useQuery<CrmData>({
    queryKey: ["home-ops"],
    queryFn: async () => (await fetch("/api/crm")).json(),
    refetchInterval: 60000,
  });

  const tasks = (data?.tasks ?? []).slice(0, 4);
  const recent = (data?.recentActivities ?? []).slice(0, 3);

  return (
    <div className="min-w-0 rounded-xl border border-card-border bg-card-background p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-badge-violet-background text-badge-violet-text [&>svg]:size-4.5">
          <ListChecks />
        </span>
        <h3 className="min-w-0 truncate text-sm font-semibold tracking-[-0.2px] text-text-primary">Operación — tareas y actividad</h3>
      </div>
      <div className="mt-3 space-y-2">
        {tasks.length === 0 ? (
          <p className="text-xs text-text-tertiary">Sin pendientes. Todo al día.</p>
        ) : (
          tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-card-border/60 px-3 py-2 text-sm">
              <span className="line-clamp-1 min-w-0 text-text-primary">{t.title}</span>
              <Badge color={t.type === "order" ? "warning" : "gray"}>{t.due}</Badge>
            </div>
          ))
        )}
      </div>
      {recent.length > 0 && (
        <>
          <div className="mt-4 border-t border-card-border pt-3">
            <p className="text-xs font-semibold text-text-secondary">Actividad reciente</p>
            <div className="mt-2 space-y-1.5">
              {recent.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-text-secondary">{a.text}</span>
                  <span className="shrink-0 text-text-tertiary">{new Date(a.at).toLocaleDateString("es-CL")}</span>
                </div>
              ))}
            </div>
          </div>
          <HomeCardLink href="/workflows">Ver flujos →</HomeCardLink>
        </>
      )}
    </div>
  );
}
