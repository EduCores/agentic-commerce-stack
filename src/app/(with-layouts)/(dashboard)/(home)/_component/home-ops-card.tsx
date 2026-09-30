"use client";

import { useQuery } from "@tanstack/react-query";
import { Bot, ListChecks, Workflow } from "lucide-react";
import { Badge } from "@/components/tailgrids/core/badge";
import { HomeCardLink } from "./home-card-link";

type CrmData = {
  tasks: { id: string; title: string; due: string; type: string }[];
  recentActivities: { id: string; text: string; at: string; kind?: string }[];
};

function activityStatus(text: string, kind?: string): { label: string; color: "success" | "error" | "warning" | "violet" | "gray" } {
  if (text.includes("Fallido")) return { label: "Fallido", color: "error" };
  if (text.includes("En curso")) return { label: "En curso", color: "warning" };
  if (text.includes("Completado") || text.includes("ejecutado")) return { label: "Completado", color: "success" };
  return { label: kind === "agent" ? "Agente" : "Flujo", color: kind === "agent" ? "violet" : "gray" };
}

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
              <Badge color={t.type === "order" ? "warning" : t.type === "email" ? "sky" : t.type === "call" ? "success" : "violet"}>{t.due}</Badge>
            </div>
          ))
        )}
      </div>
      {recent.length > 0 && (
        <>
          <div className="mt-4 border-t border-card-border pt-3">
            <p className="text-xs font-semibold text-text-secondary">Actividad reciente</p>
            <p className="mt-0.5 text-[11px] text-text-tertiary">Últimos pasos ejecutados por tus agentes (IA) y flujos automáticos</p>
            <div className="mt-2 space-y-1.5">
              {recent.map((a) => {
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
              })}
            </div>
          </div>
          <HomeCardLink href="/workflows">Ver flujos →</HomeCardLink>
        </>
      )}
    </div>
  );
}
