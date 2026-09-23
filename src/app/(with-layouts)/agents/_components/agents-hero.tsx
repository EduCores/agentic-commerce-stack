"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Bot, Activity, BadgeCheck, Cpu } from "lucide-react";

type Stats = {
  totals: { requests: number; cost: number; successRate: number; activeAgents: number };
  table: { active: boolean }[];
};

export function AgentsHero({ fallbackCount }: { fallbackCount: number }) {
  const { data } = useQuery<Stats>({
    queryKey: ["agents-hero"],
    queryFn: async () => (await fetch("/api/ai/stats")).json(),
  });

  const total = data?.totals.requests ?? 0;
  const active = data?.totals.activeAgents ?? 0;
  const success = data?.totals.successRate ?? 0;
  const cost = data?.totals.cost ?? 0;
  const agentsLen = data?.table.length ?? fallbackCount;

  return (
    <div className="overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-primary-600 p-6 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-[-0.2px]">
            <span className="flex size-7 items-center justify-center rounded-lg bg-white/15 text-white [&>svg]:size-4">
              <Bot />
            </span>
            Flota de agentes — StarShop
          </h3>
          <p className="mt-1 text-xs text-white/75">
            {agentsLen} agentes (Bienvenida + 8 equipos) · cada equipo ve solo sus herramientas · prompts en{" "}
            <code className="rounded bg-white/15 px-1 py-0.5">prisma/starshop-prompts.ts</code>
          </p>
        </div>
        <Link href="/workflows" className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur hover:bg-white/25">
          Ver flujos →
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/10 p-4 backdrop-blur">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white [&>svg]:size-6">
            <Bot />
          </span>
          <div>
            <p className="text-xs font-medium text-white/80">Agentes</p>
            <p className="text-2xl font-extrabold tracking-tight">{agentsLen}</p>
            <p className="text-xs text-white/70">{active} activos · {agentsLen - active} pausados</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white/10 p-4 backdrop-blur">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white [&>svg]:size-6">
            <Activity />
          </span>
          <div>
            <p className="text-xs font-medium text-white/80">Ejecuciones</p>
            <p className="text-2xl font-extrabold tracking-tight">{total.toLocaleString("es-CL")}</p>
            <p className="text-xs text-white/70">Últimos 30 días · éxito {success}%</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white/10 p-4 backdrop-blur">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white [&>svg]:size-6">
            <BadgeCheck />
          </span>
          <div>
            <p className="text-xs font-medium text-white/80">Tasa de éxito</p>
            <p className="text-2xl font-extrabold tracking-tight">{success}%</p>
            <p className="text-xs text-white/70">{success >= 95 ? "Excelente" : success >= 85 ? "Buena" : "Revisar"} · meta 95%</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white/10 p-4 backdrop-blur">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white [&>svg]:size-6">
            <Cpu />
          </span>
          <div>
            <p className="text-xs font-medium text-white/80">Costo estimado</p>
            <p className="text-2xl font-extrabold tracking-tight">${cost.toLocaleString("es-CL")}</p>
            <p className="text-xs text-white/70">~$0.90 por ejecución</p>
          </div>
        </div>
      </div>
    </div>
  );
}
