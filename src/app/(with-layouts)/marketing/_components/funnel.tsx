"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChartContainer } from "@/components/tailgrids/core/chart";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";
import type { MarketingData } from "./types";

const COLORS = ["#5750F1", "#8B5CF6", "#22C55E", "#F59E0B", "#06B6D4"];

export function MarketingFunnel({ data }: { data: MarketingData | null }) {
  const rows = data?.funnel ?? [];
  return (
    <Card className="min-w-0 md:col-span-2">
      <CardHeader><CardTitle className="text-sm">Embudo de conversión</CardTitle></CardHeader>
      <CardContent className="h-72 p-0">
        <ChartContainer className="h-full w-full" height="100%" width="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, left: 40, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={90} />
            <Tooltip />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {rows.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
