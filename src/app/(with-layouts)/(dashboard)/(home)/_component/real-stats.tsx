"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Badge } from "@/components/tailgrids/core/badge";
import Link from "next/link";

type Stats = {
  counts: { products: number; orders: number; customers: number; agents: number; workflows: number; agentRuns: number; workflowRuns: number };
  stock: { total: number; reserved: number; availability: number };
  revenue: number;
  salesByDay: { date: string; total: number }[];
  topProducts: { product: { title: string; sku: string } | null; quantity: number }[];
  recentOrders: { id: string; total: unknown; status: string; customer: { name: string | null } | null }[];
  recentProducts: { sku: string; title: string; stock: number }[];
};

export function RealStats() {
  const { data, isLoading } = useQuery<Stats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard/stats");
      if (!r.ok) throw new Error("No se pudieron cargar las métricas");
      return r.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Cargando tus métricas reales...</CardContent></Card>;
  if (!data) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Sin datos por ahora</CardContent></Card>;
  const alerts = data.recentOrders.filter((o) => o.status === "FAILED" || o.status === "PENDING").length;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Productos</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data.counts.products}</p>
          <p className="text-xs text-text-tertiary">Stock total {data.stock.total} · Reservado {data.stock.reserved} · Disponibilidad {data.stock.availability}%</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Pedidos</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data.counts.orders}</p>
          <p className="text-xs text-text-tertiary">Ingresos {Number(data.revenue).toLocaleString("es-CL", { style: "currency", currency: "CLP" })}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Clientes</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data.counts.customers}</p>
          <p className="text-xs text-text-tertiary">Agentes {data.counts.agents} · Ejecuciones {data.counts.agentRuns}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Flujos de trabajo</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data.counts.workflows}</p>
          <p className="text-xs text-text-tertiary">Ejecuciones {data.counts.workflowRuns}</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader><CardTitle className="text-sm">Ventas de los últimos 7 días</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-20">
            {data.salesByDay.map((d) => {
              const max = Math.max(...data.salesByDay.map((x) => x.total), 1);
              const h = Math.round((d.total / max) * 64);
              return <div key={d.date} className="flex-1 flex flex-col items-center gap-1"><div className="w-full bg-brand-500 rounded-t" style={{ height: h }} /><span className="text-[10px] text-text-tertiary">{d.date.slice(5)}</span></div>;
            })}
          </div>
        </CardContent>
      </Card>
      {alerts > 0 && (
        <Card className="md:col-span-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm"><span className="font-bold text-amber-700">⚠️ {alerts} pedido(s) con alerta</span> <span className="text-text-tertiary">— falló la validación, lo derivamos a una persona (salvamos la venta, revísalo en /orders)</span></p>
            <Link href="/orders?status=FAILED" className="text-sm font-medium text-amber-700 underline shrink-0">Ver pedidos</Link>
          </CardContent>
        </Card>
      )}

      <Card className="md:col-span-2">
        <CardHeader><CardTitle className="text-sm">Productos con más demanda</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.topProducts.length === 0 ? <p className="text-xs text-text-tertiary">Sin ventas todavía</p> : data.topProducts.map((tp, i) => (
            <div key={i} className="flex justify-between gap-2 text-sm"><span className="min-w-0">{tp.product?.title ?? "—"} <span className="text-xs text-text-tertiary">{tp.product?.sku}</span></span><Badge color="gray">{tp.quantity} uds</Badge></div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
