"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Badge } from "@/components/tailgrids/core/badge";
import { ChartContainer, ChartTooltipContent } from "@/components/tailgrids/core/chart";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import { sharePct } from "@/utils/period-stats";
import { displayModelName } from "@/utils/model-display";
import { InfoTip } from "@/components/tailgrids/core/info-tip";
import type { AiStats } from "./types";

const COLORS = ["#5750F1", "#22C55E", "#F59E0B", "#06B6D4", "#8B5CF6"];

export function AiModelsChart({ data }: { data: AiStats | null }) {
  const rows = data?.byModel ?? [];
  const totalReq = rows.reduce((a, r) => a + r.requests, 0);
  const totalCost = rows.reduce((a, r) => a + r.cost, 0);
  const totalRev = rows.reduce((a, r) => a + r.revenue, 0);
  const maxReq = Math.max(...rows.map((r) => r.requests), 1);
  const topByRequests = rows.length > 0 ? rows.reduce((a, b) => (b.requests > a.requests ? b : a), rows[0]) : null;
  const topByMargin = rows.length > 0 ? rows.reduce((a, b) => ((b.revenue - b.cost) > (a.revenue - a.cost) ? b : a), rows[0]) : null;

  if (rows.length === 0) {
    return (
      <Card className="min-w-0 md:col-span-3">
        <CardHeader><CardTitle className="text-sm">Modelos por uso — costo e ingresos generados</CardTitle></CardHeader>
        <CardContent className="p-6 text-sm text-text-tertiary">Sin datos de modelos aún.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0 md:col-span-3">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm">Modelos por uso — solicitudes, costo e ingresos</CardTitle>
            <p className="mt-1 text-xs text-text-tertiary">
              {totalReq} solicitudes · ${totalCost.toLocaleString("es-CL")} costo ·{" "}
              <span className="font-bold text-emerald-600">${totalRev.toLocaleString("es-CL")} ingresos generados</span> (estimado por agente)
            </p>
          </div>
          <Badge color="primary">{rows.length} modelos</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-5">
        <div className="md:col-span-3 min-w-0">
          <div className="h-64 p-0">
            <ChartContainer className="h-full w-full" height="100%" width="100%">
              <BarChart data={rows} margin={{ top: 16, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="model"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  dy={12}
                  height={60}
                  tickFormatter={(v: string) => displayModelName(v)}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                  width={40}
                  domain={[0, Math.ceil(maxReq * 1.15)]}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-card-border)", opacity: 0.15 }}
                  content={<ChartTooltipContent labelFormatter={(v) => displayModelName(String(v))} />}
                />
                <Bar dataKey="requests" name="Solicitudes" radius={[6, 6, 0, 0]}>
                  {rows.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                  <LabelList dataKey="requests" position="top" style={{ fontSize: 11, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
          <p className="mt-1 text-xs text-text-tertiary">Eje X: modelo · Eje Y: solicitudes del período</p>
          <div className="mt-2 flex flex-wrap gap-2 border-t border-card-border pt-3 text-xs">
            {topByRequests && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background-gray-secondary px-2.5 py-1 font-medium text-text-secondary">
                🏆 Más usado: <strong className="text-text-primary">{displayModelName(topByRequests.model)} ({topByRequests.requests})</strong>
              </span>
            )}
            {topByMargin && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background-gray-secondary px-2.5 py-1 font-medium text-text-secondary">
                💰 Mejor margen: <strong className="text-emerald-600">{displayModelName(topByMargin.model)} (${(topByMargin.revenue - topByMargin.cost).toLocaleString("es-CL")})</strong>
              </span>
            )}
          </div>
        </div>
        <div className="md:col-span-2 space-y-2">
          {rows.map((r, i) => {
            const pct = totalReq > 0 ? Math.round((r.requests / totalReq) * 1000) / 10 : 0;
            return (
              <div key={r.model} className="rounded-lg border border-card-border p-3">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="truncate font-mono text-xs font-medium text-text-primary" title={r.model}>
                    {displayModelName(r.model)}
                  </span>
                  <Badge color="gray">{pct}%</Badge>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-text-tertiary">Solicitudes</p>
                    <p className="font-bold text-text-primary">{r.requests}</p>
                  </div>
                  <div>
                    <p className="text-text-tertiary">Costo</p>
                    <p className="font-bold text-text-primary">${r.cost.toLocaleString("es-CL")}</p>
                    <p className="text-[11px] text-text-tertiary">{sharePct(r.cost, totalCost).toLocaleString("es-CL")}% del costo</p>
                  </div>
                  <div>
                    <p className="text-text-tertiary">Ingresos</p>
                    <p className="font-bold text-emerald-600">${r.revenue.toLocaleString("es-CL")}</p>
                    <p className="text-[11px] text-text-tertiary">{sharePct(r.revenue, totalRev).toLocaleString("es-CL")}% del total</p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background-gray-secondary">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            );
          })}
          <div className="flex items-start gap-1.5">
            <InfoTip label="Cómo se calculan los ingresos">
              Ingresos = solicitudes del modelo × ticket promedio real del período. Te dice qué modelo te deja más margen.
            </InfoTip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
