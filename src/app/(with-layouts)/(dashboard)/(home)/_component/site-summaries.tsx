"use client";

import { useQuery } from "@tanstack/react-query";
import { Bot, Megaphone, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/tailgrids/core/badge";
import { formatCLP } from "./home-types";
import { HomeCardLink } from "./home-card-link";

type AiTotals = { requests: number; cost: number; successRate: number; activeAgents: number };
type MarketingTotals = { impressions: number; revenue: number };

function useAiSummary() {
  return useQuery({
    queryKey: ["home-ai"],
    queryFn: async (): Promise<AiTotals | null> => {
      try {
        const r = await fetch("/api/ai/stats");
        if (!r.ok) return null;
        const j = await r.json();
        return j.totals ?? null;
      } catch {
        return null;
      }
    },
    refetchInterval: 60000,
  });
}

function useMarketingSummary() {
  return useQuery({
    queryKey: ["home-marketing"],
    queryFn: async (): Promise<{ totals: MarketingTotals; channels: unknown[] } | null> => {
      try {
        const r = await fetch("/api/marketing");
        if (!r.ok) return null;
        return r.json();
      } catch {
        return null;
      }
    },
    refetchInterval: 60000,
  });
}

function useCartsSummary() {
  return useQuery({
    queryKey: ["home-carts"],
    queryFn: async (): Promise<{ open: number; total: number } | null> => {
      try {
        const r = await fetch("/api/admin/emails/carts");
        if (!r.ok) return null; // sin sesión de admin no se muestra
        const j = await r.json();
        const open = (j.carts ?? []).filter((c: { status: string }) => c.status === "OPEN");
        const total = open.reduce((a: number, c: { total: number }) => a + Number(c.total), 0);
        return { open: open.length, total };
      } catch {
        return null;
      }
    },
    refetchInterval: 60000,
  });
}

/** Resúmenes vivos del resto del sitio: AI, marketing y carros por recuperar. */
export function SiteSummaries() {
  const ai = useAiSummary();
  const marketing = useMarketingSummary();
  const carts = useCartsSummary();

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-3">
      <div className="min-w-0 rounded-xl border border-card-border bg-card-background p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-badge-violet-background text-badge-violet-text [&>svg]:size-4.5">
            <Bot />
          </span>
          <p className="min-w-0 truncate text-sm font-medium text-text-secondary">Agente AI</p>
        </div>
        {ai.data ? (
          <>
            <p className="mt-2 break-words text-2xl font-extrabold tracking-tight text-text-primary">
              {ai.data.requests} <span className="text-sm font-medium text-text-tertiary">solicitudes</span>
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              {ai.data.successRate}% éxito · {ai.data.activeAgents} agentes · ${ai.data.cost.toLocaleString("es-CL")} costo
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-text-tertiary">Cargando AI…</p>
        )}
        <HomeCardLink href="/ai">Ver AI →</HomeCardLink>
      </div>

      <div className="min-w-0 rounded-xl border border-card-border bg-card-background p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-badge-success-background text-badge-success-text [&>svg]:size-4.5">
            <Megaphone />
          </span>
          <p className="min-w-0 truncate text-sm font-medium text-text-secondary">Marketing</p>
        </div>
        {marketing.data ? (
          <>
            <p className="mt-2 break-words text-2xl font-extrabold tracking-tight text-text-primary">
              {formatCLP(marketing.data.totals.revenue)}
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              {marketing.data.totals.impressions.toLocaleString("es-CL")} impresiones · {marketing.data.channels.length} canales
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-text-tertiary">Cargando marketing…</p>
        )}
        <HomeCardLink href="/marketing">Ver marketing →</HomeCardLink>
      </div>

      {carts.data && carts.data.open > 0 && (
        <div className="min-w-0 rounded-xl border border-card-border bg-card-background p-5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-badge-warning-background text-badge-warning-text [&>svg]:size-4.5">
              <ShoppingBag />
            </span>
            <p className="min-w-0 truncate text-sm font-medium text-text-secondary">Carros por recuperar</p>
          </div>
          <p className="mt-2 break-words text-2xl font-extrabold tracking-tight text-text-primary">
            {carts.data.open} <span className="text-sm font-medium text-text-tertiary">abandonados</span>
          </p>
          <p className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs text-text-tertiary">
            <span className="min-w-0 break-words">{formatCLP(carts.data.total)} en juego</span> <Badge color="warning">recupera</Badge>
          </p>
          <HomeCardLink href="/admin/emails">Recuperar →</HomeCardLink>
        </div>
      )}
    </div>
  );
}
