"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChartContainer, ChartTooltipContent } from "@/components/tailgrids/core/chart";
import { Pie, PieChart, Cell, Tooltip } from "recharts";

const COLORS = ["#5750F1", "#22C55E", "#F59E0B", "#06B6D4", "#8B5CF6"];

export function AgentsModelsChart() {
  const { data } = useQuery<{ byModel: { model: string; requests: number; cost: number; revenue: number }[] }>({
    queryKey: ["agents-models"],
    queryFn: async () => (await fetch("/api/ai/stats")).json(),
  });

  const rows = data?.byModel ?? [];
  const total = rows.reduce((a, r) => a + r.requests, 0);

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">Modelos en uso — distribución</CardTitle></CardHeader>
        <CardContent className="p-6 text-sm text-text-tertiary">Sin modelos aún.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Modelos en uso — distribución</CardTitle>
        <p className="text-xs text-text-tertiary">
          {total} solicitudes · {rows.length} modelos · costo ${rows.reduce((a, r) => a + r.cost, 0).toLocaleString("es-CL")}
        </p>
      </CardHeader>
      <CardContent className="h-72 p-0">
        <ChartContainer className="h-full w-full" height="100%" width="100%">
          <PieChart>
            <Pie data={rows} dataKey="requests" nameKey="model" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${String(name ?? "").split("/").pop()} ${(((percent as number) ?? 0) * 100).toFixed(0)}%`}>
              {rows.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
