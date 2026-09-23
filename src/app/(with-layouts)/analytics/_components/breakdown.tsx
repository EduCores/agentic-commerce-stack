"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChartContainer } from "@/components/tailgrids/core/chart";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import { BreakdownTooltip } from "./breakdown-tooltip";
import { sharePct } from "@/utils/period-stats";
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
  if (s.includes("meta") || s.includes("facebook") || s.includes("instagram") || s.includes("shopify")) return "Meta";
  if (s.includes("whatsapp") || s === "eve" || s.startsWith("eve_") || s.startsWith("eve-")) return "Whatsapp";
  if (s === "manual" || s.includes("tienda") || s === "store") return "Tienda física";
  return source;
}

const STATUS_COLOR: Record<string, string> = {
  PAID: "#22C55E",
  FULFILLED: "#10B981",
  PENDING: "#F59E0B",
  RESERVED: "#FBBF24",
  FAILED: "#EF4444",
  CANCELLED: "#94A3B8",
  REFUNDED: "#64748B",
};

export function AnalyticsStatusChart({ data, className }: { data: AnalyticsData | null; className?: string }) {
  const byStatus = [...(data?.byStatus ?? [])].sort((a, b) => a.count - b.count);
  const totalOrders = byStatus.reduce((a, s) => a + s.count, 0);
  const totalRevenue = byStatus.reduce((a, s) => a + (s.revenue ?? 0), 0);
  const paidOrders = byStatus.filter((s) => s.status === "PAID" || s.status === "FULFILLED").reduce((a, s) => a + s.count, 0);
  const paidRate = totalOrders > 0 ? Math.round((paidOrders / totalOrders) * 1000) / 10 : 0;
  const maxCount = Math.max(...byStatus.map((s) => s.count), 1);
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm">Por estado de pedido</CardTitle>
            <p className="mt-1 text-xs text-text-tertiary">
              {totalOrders.toLocaleString("es-CL")} pedidos ·{" "}
              <span className="font-bold text-emerald-600">{paidRate.toLocaleString("es-CL")}% pagados</span>
            </p>
          </div>
          <span className="rounded-full bg-background-gray-secondary px-2.5 py-1 text-xs font-bold text-text-primary">
            ${totalRevenue.toLocaleString("es-CL")}
          </span>
        </div>
      </CardHeader>
      <CardContent className="h-72 p-0">
        <ChartContainer className="h-full w-full" height="100%" width="100%">
          <BarChart data={byStatus} margin={{ top: 16, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="status"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10 }}
              interval={0}
              tickFormatter={(v: string) => STATUS_ES[v] ?? v}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} domain={[0, Math.ceil(maxCount * 1.15)]} />
            <Tooltip
              content={
                <BreakdownTooltip
                  totalOrders={totalOrders}
                  nameFor={(raw) => STATUS_ES[raw] ?? raw}
                />
              }
            />
            <Bar dataKey="count" name="Pedidos" radius={[6, 6, 0, 0]}>
              {byStatus.map((s) => (
                <Cell key={s.status} fill={STATUS_COLOR[s.status] ?? "#5750F1"} />
              ))}
              <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 700 }} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-card-border px-5 py-3 text-xs text-text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
          Pagado/Completado <strong className="text-text-primary">{paidOrders}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amber-500" aria-hidden="true" />
          Pendiente/Reservado <strong className="text-text-primary">{byStatus.filter((s) => s.status === "PENDING" || s.status === "RESERVED").reduce((a, s) => a + s.count, 0)}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-500" aria-hidden="true" />
          Fallido/Cancelado <strong className="text-text-primary">{byStatus.filter((s) => ["FAILED", "CANCELLED", "REFUNDED"].includes(s.status)).reduce((a, s) => a + s.count, 0)}</strong>
        </span>
      </div>
    </Card>
  );
}

export function AnalyticsSourceChart({ data, className }: { data: AnalyticsData | null; className?: string }) {
  // Fusiona fuentes que normalizan al mismo canal (ej. "eve" + "whatsapp" → "Whatsapp"):
  // evita keys duplicadas y suma pedidos e ingresos reales.
  const merged = new Map<string, { source: string; count: number; revenue: number }>();
  for (const s of data?.bySource ?? []) {
    const label = sourceLabel(s.source);
    const prev = merged.get(label);
    if (prev) {
      prev.count += s.count;
      prev.revenue += s.revenue ?? 0;
    } else {
      merged.set(label, { source: label, count: s.count, revenue: s.revenue ?? 0 });
    }
  }
  const bySource = [...merged.values()];
  const totalOrders = bySource.reduce((a, s) => a + s.count, 0);
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm">Por canal (source)</CardTitle>
        <p className="text-xs text-text-tertiary">{totalOrders.toLocaleString("es-CL")} pedidos · participación real</p>
      </CardHeader>
      <CardContent className="relative h-64 p-0">
        <ChartContainer className="h-full w-full" height="100%" width="100%">
          <PieChart>
            <Pie
              data={bySource}
              dataKey="count"
              nameKey="source"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={2}
              strokeWidth={0}
            >
              {bySource.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<BreakdownTooltip totalOrders={totalOrders} />} />
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="text-2xl font-extrabold tracking-tight text-text-primary">{totalOrders.toLocaleString("es-CL")}</span>
          <span className="mt-1 text-xs font-medium text-text-tertiary">pedidos</span>
        </div>
      </CardContent>
      <div className="space-y-1.5 border-t border-card-border px-5 py-3">
        {bySource.map((s, i) => (
          <div key={s.source} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-1.5 font-medium text-text-secondary">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} aria-hidden="true" />
              <span className="min-w-0 truncate">{s.source}</span>
            </span>
            <span className="shrink-0 font-bold text-text-primary">
              {s.count} <span className="font-medium text-text-tertiary">· {sharePct(s.count, totalOrders).toLocaleString("es-CL")}%</span>
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
