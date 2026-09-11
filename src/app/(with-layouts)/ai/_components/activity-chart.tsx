"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChartContainer, ChartTooltipContent } from "@/components/tailgrids/core/chart";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";
import type { AiStats } from "./types";

export function AiActivityChart({ data }: { data: AiStats | null }) {
  const rows = data?.byDay ?? [];
  return (
    <Card className="min-w-0 md:col-span-2">
      <CardHeader><CardTitle className="text-sm">Actividad semanal de AI</CardTitle></CardHeader>
      <CardContent className="h-64 p-0">
        <ChartContainer className="h-full w-full" height="100%" width="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={<ChartTooltipContent />} />
            <Bar dataKey="requests" name="Solicitudes" radius={[6, 6, 0, 0]}>
              {rows.map((_, i) => (
                <Cell key={i} fill={i === rows.length - 1 ? "#5750F1" : "#C7D2FE"} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
