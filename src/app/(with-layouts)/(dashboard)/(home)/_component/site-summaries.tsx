"use client";

import { useQuery } from "@tanstack/react-query";
import { Bot, Megaphone, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/tailgrids/core/badge";
import { formatCLP } from "./home-types";
import { HomeCardLink } from "./home-card-link";
import { sharePct } from "@/utils/period-stats";

type AiTotals = { requests: number; cost: number; successRate: number; activeAgents: number };
type AiDay = { day: string; requests: number };
type MarketingChannel = { channel: string; revenue: number; convRate: number; isLive?: boolean };
type MarketingTotals = { impressions: number; revenue: number };

function useAiSummary() {
  return useQuery({
    queryKey: ["home-ai"],
    queryFn: async (): Promise<{ totals: AiTotals | null; byDay: AiDay[] }> => {
      try {
        const r = await fetch("/api/ai/stats?days=14");
        if (!r.ok) return { totals: null, byDay: [] };
        const j = await r.json();
        return { totals: j.totals ?? null, byDay: j.byDay ?? [] };
      } catch {
        return { totals: null, byDay: [] };
      }
    },
    refetchInterval: 60000,
  });
}

function useMarketingSummary() {
  return useQuery({
    queryKey: ["home-marketing"],
    queryFn: async (): Promise<{ totals: MarketingTotals; channels: MarketingChannel[] } | null> => {
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

/** Punto "en vivo" con pulso. */
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

/** Mini sparkline SVG (área + línea), sin dependencias y sin desborde. */
function Sparkline({ values, stroke = "#8B5CF6", id }: { values: number[]; stroke?: string; id: string }) {
  const w = 100;
  const h = 32;
  if (values.length === 0) return <div className="h-10" aria-hidden="true" />;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(1, max - min);
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? w : (i / (values.length - 1)) * w;
    const y = h - 3 - ((v - min) / span) * (h - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = pts.join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-10 w-full" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Resúmenes vivos del resto del sitio: AI, marketing y carros por recuperar. */
export function SiteSummaries() {
  const ai = useAiSummary();
  const marketing = useMarketingSummary();
  const carts = useCartsSummary();

  const aiTotals = ai.data?.totals ?? null;
  const aiDays = (ai.data?.byDay ?? []).map((d) => d.requests);
  const mktChannels = [...(marketing.data?.channels ?? [])].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0));
  const mktTotal = mktChannels.reduce((a, c) => a + (c.revenue ?? 0), 0);
  const avgTicket = carts.data && carts.data.open > 0 ? Math.round(carts.data.total / carts.data.open) : 0;

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-3">
      {/* AI — actividad real + tasa de éxito */}
      <div className="min-w-0 rounded-xl border border-card-border bg-card-background p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-badge-violet-background text-badge-violet-text [&>svg]:size-4.5">
              <Bot />
            </span>
            <p className="min-w-0 truncate text-sm font-medium text-text-secondary">Agente AI</p>
          </div>
          <LiveDot />
        </div>
        {aiTotals ? (
          <>
            <p className="mt-2 break-words text-2xl font-extrabold tracking-tight text-text-primary">
              {aiTotals.requests.toLocaleString("es-CL")} <span className="text-sm font-medium text-text-tertiary">solicitudes</span>
            </p>
            <div className="mt-2">
              <Sparkline values={aiDays} id="home-ai-spark" />
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-600">{aiTotals.successRate.toLocaleString("es-CL")}% éxito</span>
                <span className="text-text-tertiary">{aiTotals.activeAgents} agentes · ${aiTotals.cost.toLocaleString("es-CL")} costo</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background-gray-secondary">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${Math.min(100, aiTotals.successRate)}%` }} />
              </div>
            </div>
          </>
        ) : (
          <p className="mt-2 text-xs text-text-tertiary">Cargando AI…</p>
        )}
        <HomeCardLink href="/ai">Ver AI →</HomeCardLink>
      </div>

      {/* Marketing — ingresos + top canales reales */}
      <div className="min-w-0 rounded-xl border border-card-border bg-card-background p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-badge-success-background text-badge-success-text [&>svg]:size-4.5">
              <Megaphone />
            </span>
            <p className="min-w-0 truncate text-sm font-medium text-text-secondary">Marketing</p>
          </div>
          <LiveDot />
        </div>
        {marketing.data ? (
          <>
            <p className="mt-2 break-words text-2xl font-extrabold tracking-tight text-text-primary">
              {formatCLP(marketing.data.totals.revenue)}
            </p>
            <div className="mt-2 space-y-1.5">
              {mktChannels.slice(0, 3).map((c) => {
                const pct = sharePct(c.revenue ?? 0, mktTotal);
                return (
                  <div key={c.channel} className="min-w-0">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate font-medium text-text-secondary">{c.channel}</span>
                      <span className="shrink-0 font-bold text-text-primary">{pct.toLocaleString("es-CL")}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background-gray-secondary">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-text-tertiary">
              {marketing.data.totals.impressions.toLocaleString("es-CL")} impresiones · {marketing.data.channels.length} canales
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-text-tertiary">Cargando marketing…</p>
        )}
        <HomeCardLink href="/marketing">Ver marketing →</HomeCardLink>
      </div>

      {/* Carros — dinero en juego con urgencia */}
      {carts.data && carts.data.open > 0 && (
        <div className="min-w-0 rounded-xl border border-card-border bg-card-background p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-badge-warning-background text-badge-warning-text [&>svg]:size-4.5">
                <ShoppingBag />
              </span>
              <p className="min-w-0 truncate text-sm font-medium text-text-secondary">Carros por recuperar</p>
            </div>
            <LiveDot color="bg-red-500" />
          </div>
          <p className="mt-2 break-words text-2xl font-extrabold tracking-tight text-text-primary">
            {formatCLP(carts.data.total)} <span className="text-sm font-medium text-text-tertiary">en juego</span>
          </p>
          <div className="mt-2 rounded-lg bg-background-gray-secondary/60 p-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-text-primary">{carts.data.open} abandonados</span>
              <Badge color="warning">recupera</Badge>
            </div>
            <p className="mt-1 text-xs text-text-tertiary">
              Ticket promedio abandonado: <strong className="text-text-primary">{formatCLP(avgTicket)}</strong>
            </p>
          </div>
          <HomeCardLink href="/admin/emails">Recuperar →</HomeCardLink>
        </div>
      )}
    </div>
  );
}
