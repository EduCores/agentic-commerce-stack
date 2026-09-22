"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChartContainer, ChartTooltipContent } from "@/components/tailgrids/core/chart";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#5750F1", "#22C55E", "#F59E0B", "#06B6D4", "#8B5CF6", "#EF4444", "#10B981", "#3B82F6"];

export function AgentsRequestsChart() {
  const { data } = useQuery<{ table: { name: string; requests: number; active: boolean }[] }>({
    queryKey: ["agents-requests"],
    queryFn: async () => (await fetch("/api/ai/stats")).json(),
  });

  const rows = (data?.table ?? []).slice(0, 8).map((a) => ({ name: a.name, solicitudes: a.requests, fill: a.active ? "#5750F1" : "#CBD5E1" }));

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">Solicitudes por agente</CardTitle></CardHeader>
        <CardContent className="p-6 text-sm text-text-tertiary">Sin datos aún.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Solicitudes por agente — carga de trabajo</CardTitle>
        <p className="text-xs text-text-tertiary">Quién resuelve más · verde activo, gris pausado</p>
      </CardHeader>
      <CardContent className="h-72 p-0">
        <ChartContainer className="h-full w-full" height="100%" width="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={120} />
            <Tooltip content={<ChartTooltipContent />} />
            <Bar dataKey="solicitudes" radius={[0, 6, 6, 0]}>
              {rows.map((r, i) => (
                <Cell key={r.name} fill={COLORS[i % COLORS.length]} opacity={r.fill === "#CBD5E1" ? 0.5 : 1} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
