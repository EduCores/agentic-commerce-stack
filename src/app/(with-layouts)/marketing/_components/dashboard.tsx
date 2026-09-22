"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { MarketingFunnel } from "./funnel";
import { MarketingChannelTable } from "./channel-table";
import type { MarketingData } from "./types";
import Link from "next/link";

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
        <CardHeader><CardTitle className="text-sm">Rendimiento de campañas</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data.totals.impressions.toLocaleString("es-CL")}</p>
          <p className="text-xs text-text-tertiary">Impresiones estimadas · Ingresos ${data.totals.revenue.toLocaleString("es-CL")}</p>
        </CardContent>
      </Card>
      <Card className="min-w-0 md:col-span-2">
        <CardHeader><CardTitle className="text-sm">Campañas por tienda (catálogo híbrido)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.campaigns.length === 0 ? <p className="text-sm text-text-tertiary">Conecta una tienda en /store.</p> : data.campaigns.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-card-border p-3 text-sm">
              <span>{c.name}</span>
              <span className="flex items-center gap-2">
                <Badge color="gray">{c.products} productos</Badge>
                <Badge color="gray">{c.orders} pedidos</Badge>
                <Badge color={c.active ? "success" : "gray"}>{c.active ? "Activa" : "Pausada"}</Badge>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      <MarketingFunnel data={data} />
      <div className="grid gap-4 md:col-span-3 md:grid-cols-2">
        <MarketingChannelTable data={data} />
        <Card className="min-w-0">
          <CardHeader><CardTitle className="text-sm">Información de la audiencia</CardTitle></CardHeader>
          <CardContent className="text-sm text-text-secondary">
            <p>
              <strong className="text-2xl font-extrabold tracking-tight text-text-primary">
                {(data.audience?.customers ?? 0).toLocaleString("es-CL")}
              </strong>{" "}
              <span className="text-text-tertiary">compradores únicos</span>
            </p>
            <div className="mt-3 space-y-1.5">
              {(data.audience?.byChannel ?? []).slice(0, 4).map((a) => (
                <div key={a.channel} className="flex items-center justify-between gap-2 text-sm">
                  <span>{a.channel}</span>
                  <Badge color="gray">{a.customers} personas</Badge>
                </div>
              ))}
            </div>
            {(() => {
              const best = [...data.channels].sort((a, b) => b.convRate - a.convRate)[0];
              return best ? (
                <p className="mt-3 border-t border-card-border pt-3 text-xs text-text-tertiary">
                  Tu mejor canal es <strong className="text-text-primary">{best.channel}</strong> con{" "}
                  <strong className="text-text-primary">{best.convRate}% conversión</strong>. Refuérzalo y
                  recupera carritos desde /admin/emails.
                </p>
              ) : null;
            })()}
            <Link href="/admin/emails" className="mt-1 inline-block text-xs font-medium text-brand-600 underline">Ir a correos electrónicos</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
