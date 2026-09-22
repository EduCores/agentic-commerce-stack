"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChartContainer, ChartTooltipContent } from "@/components/tailgrids/core/chart";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalyticsData } from "./types";

const COLORS = ["#5750F1", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

const STATUS_ES: Record<string, string> = {
  PENDING: "Pendiente",
  RESERVED: "Reservado",
  PAID: "Pagado",
  FULFILLED: "Completado",
  CANCELLED: "Cancelado",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
};

/** Nombres de canal en español (igual que en /marketing). */
function sourceLabel(source: string): string {
  const s = source.trim().toLowerCase();
  if (s.includes("starshop")) return "StarShop";
  if (s.includes("meta") || s.includes("facebook") || s.includes("instagram")) return "Meta";
  if (s.includes("whatsapp")) return "WhatsApp";
  if (s === "manual" || s.includes("tienda") || s === "store") return "Tienda física";
  return source;
}

export function AnalyticsStatusChart({ data, className }: { data: AnalyticsData | null; className?: string }) {
  const byStatus = data?.byStatus ?? [];
  return (
    <Card className={className}>
      <CardHeader><CardTitle className="text-sm">Por estado de pedido</CardTitle></CardHeader>
      <CardContent className="h-72 p-0">
        <ChartContainer className="h-full w-full" height="100%" width="100%">
          <BarChart data={byStatus} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="status"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10 }}
              interval={0}
              tickFormatter={(v: string) => STATUS_ES[v] ?? v}
            />
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
  );
}

export function AnalyticsSourceChart({ data, className }: { data: AnalyticsData | null; className?: string }) {
  const bySource = (data?.bySource ?? []).map((s) => ({ ...s, source: sourceLabel(s.source) }));
  return (
    <Card className={className}>
      <CardHeader><CardTitle className="text-sm">Por canal (source)</CardTitle></CardHeader>
      <CardContent className="h-72 p-0">
        <ChartContainer className="h-full w-full" height="100%" width="100%">
          <PieChart>
            <Pie data={bySource} dataKey="count" nameKey="source" outerRadius={80} label>
              {bySource.map((_, i) => (
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
