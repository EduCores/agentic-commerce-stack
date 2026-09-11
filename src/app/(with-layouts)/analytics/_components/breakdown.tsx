"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChartContainer, ChartTooltipContent } from "@/components/tailgrids/core/chart";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalyticsData } from "./types";

const COLORS = ["#5750F1", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

export function AnalyticsBreakdown({ data }: { data: AnalyticsData | null }) {
  const byStatus = data?.byStatus ?? [];
  const bySource = data?.bySource ?? [];
  return (
    <>
      <Card>
        <CardHeader><CardTitle className="text-sm">Por estado de pedido</CardTitle></CardHeader>
        <CardContent className="h-72 p-0">
          <ChartContainer className="h-full w-full" height="100%" width="100%">
            <BarChart data={byStatus} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="status" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} interval={0} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" name="Pedidos" radius={[6, 6, 0, 0]}>
                {byStatus.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Por canal (source)</CardTitle></CardHeader>
        <CardContent className="h-72 p-0">
          <ChartContainer className="h-full w-full" height="100%" width="100%">
            <PieChart>
              <Pie data={bySource} dataKey="count" nameKey="source" outerRadius={90} label>
                {bySource.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  );
}
