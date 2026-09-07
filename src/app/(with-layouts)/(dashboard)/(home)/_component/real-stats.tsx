"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Badge } from "@/components/tailgrids/core/badge";

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
      if (!r.ok) throw new Error("No se pudo cargar stats");
      return r.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Cargando métricas reales...</CardContent></Card>;
  if (!data) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Sin datos</CardContent></Card>;

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
          <p className="text-xs text-text-tertiary">Agentes {data.counts.agents} · Runs {data.counts.agentRuns}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Workflows</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data.counts.workflows}</p>
          <p className="text-xs text-text-tertiary">Runs {data.counts.workflowRuns}</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader><CardTitle className="text-sm">Ventas últimos 7 días</CardTitle></CardHeader>
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

      <Card className="md:col-span-2">
        <CardHeader><CardTitle className="text-sm">Top productos por demanda</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.topProducts.length === 0 ? <p className="text-xs text-text-tertiary">Sin ventas aún</p> : data.topProducts.map((tp, i) => (
            <div key={i} className="flex justify-between text-sm"><span>{tp.product?.title ?? "—"} <span className="text-xs text-text-tertiary">{tp.product?.sku}</span></span><Badge color="gray">{tp.quantity} uds</Badge></div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
