"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { MarketingFunnel } from "./funnel";
import { MarketingChannelTable } from "./channel-table";
import type { MarketingData } from "./types";

export function MarketingDashboard() {
  const { data, isLoading } = useQuery<MarketingData>({
    queryKey: ["marketing"],
    queryFn: async () => (await fetch("/api/marketing")).json(),
  });

  if (isLoading) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Cargando marketing...</CardContent></Card>;
  if (!data) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Sin datos</CardContent></Card>;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader><CardTitle className="text-sm">Campaign Performance</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data.totals.impressions.toLocaleString("es-CL")}</p>
          <p className="text-xs text-text-tertiary">Impresiones estimadas · Ingresos ${data.totals.revenue.toLocaleString("es-CL")}</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader><CardTitle className="text-sm">Campañas por tienda (catálogo híbrido)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.campaigns.length === 0 ? <p className="text-sm text-text-tertiary">Conecta una tienda en /store.</p> : data.campaigns.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-card-border p-3 text-sm">
              <span>{c.name}</span>
              <span className="flex items-center gap-2">
                <Badge color="gray">{c.products} prod</Badge>
                <Badge color="gray">{c.orders} ped</Badge>
                <Badge color={c.active ? "success" : "gray"}>{c.active ? "Activa" : "Pausada"}</Badge>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      <MarketingFunnel data={data} />
      <Card>
        <CardHeader><CardTitle className="text-sm">Audience Insights</CardTitle></CardHeader>
        <CardContent className="text-sm text-text-secondary">
          <p>Tus compradores llegan por: {data.channels.slice(0, 3).map((c) => c.channel).join(", ") || "—"}.</p>
          <p className="mt-2 text-xs text-text-tertiary">Refuerza el canal con mejor conversión y recupera carritos desde /admin/emails.</p>
          <a href="/admin/emails" className="text-xs font-medium text-brand-600 underline">Ir a emails</a>
        </CardContent>
      </Card>
      <MarketingChannelTable data={data} />
    </div>
  );
}
