"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChartContainer, ChartTooltipContent } from "@/components/tailgrids/core/chart";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import type { CrmData } from "./types";

export function CrmGrowthChart({ data }: { data: CrmData | null }) {
  const rows = data?.growth ?? [];
  const newLeads = rows.reduce((a, r) => a + r.leads, 0);
  const revenue = rows.reduce((a, r) => a + (r.revenue ?? 0), 0);

  return (
    <Card className="min-w-0 md:col-span-3">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Crecimiento de clientes — últimas 6 semanas</CardTitle>
          <p className="text-xs font-bold text-text-primary">
            +{newLeads} <span className="font-medium text-text-tertiary">clientes ·</span> ${revenue.toLocaleString("es-CL")}{" "}
            <span className="font-medium text-text-tertiary">ingresos</span>
          </p>
        </div>
      </CardHeader>
      <CardContent className="h-64 p-0">
        <ChartContainer className="h-full w-full" height="100%" width="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 0, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <defs>
              <linearGradient id="crm-growth-bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="crm-revenue-bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} width={30} />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)} mil` : `${v}`)}
              width={48}
            />
            <Tooltip content={<ChartTooltipContent />} />
            <Area yAxisId="left" type="monotone" dataKey="leads" name="Clientes nuevos" stroke="#22C55E" strokeWidth={2} fill="url(#crm-growth-bg)" dot={false} />
            <Area yAxisId="right" type="monotone" dataKey="revenue" name="Ingresos ($)" stroke="#8B5CF6" strokeWidth={2} fill="url(#crm-revenue-bg)" dot={false} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <div className="flex flex-wrap items-center gap-3 border-t border-card-border px-5 py-3 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: "#22C55E" }} aria-hidden="true" />
          Clientes nuevos (n°)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: "#8B5CF6" }} aria-hidden="true" />
          Ingresos ($)
        </span>
      </div>
    </Card>
  );
}
