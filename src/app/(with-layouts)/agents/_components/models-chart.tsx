"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChartContainer, ChartTooltipContent } from "@/components/tailgrids/core/chart";
import { Pie, PieChart, Cell, Tooltip } from "recharts";
import { Badge } from "@/components/tailgrids/core/badge";
import { sharePct } from "@/utils/period-stats";
import { displayModelName } from "@/utils/model-display";

const COLORS = ["#5750F1", "#22C55E", "#F59E0B", "#06B6D4", "#8B5CF6"];

type ModelRow = { model: string; requests: number; cost: number; revenue: number };

/** Distribución por modelo: dona limpia + ranking con costo e ingresos debajo. */
export function AgentsModelsChart() {
  const { data } = useQuery<{ byModel: ModelRow[] }>({
    queryKey: ["agents-models"],
    queryFn: async () => (await fetch("/api/ai/stats")).json(),
  });

  const rows = data?.byModel ?? [];
  const total = rows.reduce((a, r) => a + r.requests, 0);
  const totalCost = rows.reduce((a, r) => a + r.cost, 0);
  const totalRevenue = rows.reduce((a, r) => a + r.revenue, 0);

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">Modelos en uso — distribución</CardTitle></CardHeader>
        <CardContent className="p-6 text-sm text-text-tertiary">Sin modelos aún.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-sm">Modelos en uso — distribución</CardTitle>
        <p className="mt-1 text-xs text-text-tertiary">
          {total.toLocaleString("es-CL")} solicitudes · {rows.length} modelos · costo ${totalCost.toLocaleString("es-CL")} ·{" "}
          <span className="font-bold text-emerald-600">${totalRevenue.toLocaleString("es-CL")} ingresos</span>
        </p>
      </CardHeader>
      <CardContent className="relative h-64 p-0">
        <ChartContainer className="h-full w-full" height="100%" width="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="requests"
              nameKey="model"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={88}
              paddingAngle={2}
              strokeWidth={0}
            >
              {rows.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="text-2xl font-extrabold tracking-tight text-text-primary">{total.toLocaleString("es-CL")}</span>
          <span className="mt-1 text-xs font-medium text-text-tertiary">solicitudes</span>
        </div>
      </CardContent>
      <div className="border-t border-card-border px-5 py-3">
        <p className="text-xs font-semibold text-text-secondary">Ranking — costo e ingresos por modelo</p>
        <div className="mt-2 space-y-2">
          {rows.map((r, i) => (
            <div key={r.model} className="rounded-lg border border-card-border/60 p-2.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-mono font-medium text-text-primary" title={r.model}>
                  {displayModelName(r.model)}
                </span>
                <span className="shrink-0 font-bold text-text-primary">{r.requests.toLocaleString("es-CL")} sol.</span>
                <Badge color={i === 0 ? "primary" : "gray"}>{sharePct(r.requests, total).toLocaleString("es-CL")}%</Badge>
              </div>
              <div className="mt-1 flex items-center gap-3 pl-[18px] text-xs text-text-tertiary">
                <span>Costo <strong className="text-text-primary">${r.cost.toLocaleString("es-CL")}</strong></span>
                <span>Ingresos <strong className="text-emerald-600">${r.revenue.toLocaleString("es-CL")}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
