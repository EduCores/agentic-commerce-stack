"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Badge } from "@/components/tailgrids/core/badge";
import { ChartContainer, ChartTooltipContent } from "@/components/tailgrids/core/chart";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import Link from "next/link";
import type { MarketingData } from "./types";

const COLORS = ["#5750F1", "#8B5CF6", "#22C55E", "#F59E0B", "#06B6D4"];

function pct(n: number): string {
  return `${(Math.round(n * 1000) / 10).toLocaleString("es-CL")}%`;
}

/** Embudo a lo ancho con las conversiones que importan: por etapa y total. */
export function MarketingFunnel({ data }: { data: MarketingData | null }) {
  const rows = data?.funnel ?? [];
  const first = rows[0]?.value ?? 0;
  const last = rows[rows.length - 1]?.value ?? 0;
  const overall = first > 0 ? last / first : 0;
  const steps = rows.slice(1).map((r, i) => {
    const prev = rows[i].value;
    return { stage: r.stage, value: r.value, conv: prev > 0 ? r.value / prev : 0 };
  });

  return (
    <Card className="min-w-0 md:col-span-3">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Embudo de conversión</CardTitle>
          <Badge color="primary">Conversión total: {pct(overall)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="h-72 p-0">
        <ChartContainer className="h-full w-full" height="100%" width="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 48, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickCount={7} />
            <YAxis type="category" dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={78} />
            <Tooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" name="Cantidad" radius={[0, 6, 6, 0]}>
              {rows.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v: React.ReactNode) => Number(v ?? 0).toLocaleString("es-CL")}
                style={{ fontSize: 11 }}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <div className="flex flex-wrap items-center gap-2 border-t border-card-border px-5 py-3">
        {steps.map((s, i) => (
          <span key={s.stage} className="flex items-center gap-1.5 rounded-lg bg-background-gray-secondary px-2.5 py-1 text-xs text-text-secondary">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[(i + 1) % COLORS.length] }}
              aria-hidden="true"
            />
            {s.stage}: <strong className="text-text-primary">{pct(s.conv)}</strong>
          </span>
        ))}
        <Link href="/admin/emails" className="ml-auto text-xs font-medium text-brand-600 underline">
          Recuperar abandonos →
        </Link>
      </div>
    </Card>
  );
}
