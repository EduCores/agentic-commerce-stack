"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { MarketingFunnel } from "./funnel";
import { MarketingChannelTable } from "./channel-table";
import { InfoTip } from "@/components/tailgrids/core/info-tip";
import { sharePct } from "@/utils/period-stats";
import type { MarketingData } from "./types";
import Link from "next/link";
import { Megaphone, Package, Store, TrendingUp } from "lucide-react";
import { MetaConnectCard } from "./meta-connect-card";

function CampaignsHero({ data }: { data: MarketingData }) {
  const totalProducts = data.campaigns.reduce((a, c) => a + c.products, 0);
  const active = data.campaigns.filter((c) => c.active).length;
  return (
    <div className="mt-2.5 overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-primary-500 p-6 text-white md:col-span-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-[-0.2px]">
            <span className="flex size-7 items-center justify-center rounded-lg bg-white/15 [&>svg]:size-4">
              <Megaphone />
            </span>
            Rendimiento de campañas
          </h3>
          <p className="mt-1 text-xs text-white/75">
            Catálogo híbrido: cada tienda conectada es una campaña. Datos compartidos por <span className="font-semibold text-white">StoreConnection</span> (productos + pedidos por tienda).
          </p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white">
            <span className="size-1.5 rounded-full bg-amber-300" /> Modo mock — conecta para datos reales
          </span>
        </div>
        <Link href="/store" className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur hover:bg-white/25">
          Gestionar tiendas →
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 [&>svg]:size-4">
              <TrendingUp />
            </span>
            <p className="text-xs font-medium text-white/80">Impresiones</p>
          </div>
          <p className="mt-2 text-2xl font-extrabold tracking-tight">{data.totals.impressions.toLocaleString("es-CL")}</p>
          <p className="text-xs text-white/70">Estimadas · funnel × visitas</p>
        </div>
        <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 [&>svg]:size-4">
              <TrendingUp />
            </span>
            <p className="text-xs font-medium text-white/80">Ingresos</p>
          </div>
          <p className="mt-2 text-2xl font-extrabold tracking-tight">${data.totals.revenue.toLocaleString("es-CL")}</p>
          <p className="text-xs text-white/70">{data.campaigns.length} campañas · {active} activas</p>
        </div>
        <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 [&>svg]:size-4">
              <Store />
            </span>
            <p className="text-xs font-medium text-white/80">Campañas / tiendas</p>
          </div>
          <p className="mt-2 text-2xl font-extrabold tracking-tight">{data.campaigns.length}</p>
          <p className="text-xs text-white/70">{active} activas · se crean en /store</p>
        </div>
        <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 [&>svg]:size-4">
              <Package />
            </span>
            <p className="text-xs font-medium text-white/80">Productos en catálogo</p>
          </div>
          <p className="mt-2 text-2xl font-extrabold tracking-tight">{totalProducts.toLocaleString("es-CL")}</p>
          <p className="text-xs text-white/70">Híbrido · Starshop + conectadas</p>
        </div>
      </div>

    </div>
  );
}

function CampaignsDetail({ data }: { data: MarketingData }) {
  if (data.campaigns.length === 0) {
    return (
      <Card className="min-w-0 md:col-span-3">
        <CardHeader><CardTitle className="text-sm">Campañas por tienda — catálogo híbrido</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-text-tertiary">Aún no hay campañas. Conecta una tienda en /store para crear la primera (mock para demo, shopify con dominio/apiKey para real).</p>
          <Link href="/store" className="mt-2 inline-block text-xs font-medium text-brand-600 underline">Ir a /store →</Link>
        </CardContent>
      </Card>
    );
  }
  const totalCampaignRevenue = data.campaigns.reduce((a, c) => a + (c.revenue ?? 0), 0);
  return (
    <Card className="min-w-0 md:col-span-3">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Campañas por tienda — desglose real</CardTitle>
          <Link href="/store" className="text-xs font-medium text-brand-600 underline">Gestionar en /store →</Link>
        </div>
        <p className="text-xs text-text-tertiary">Cada fila es una tienda conectada. Productos y pedidos vienen por <code>storeId</code>; ingresos = suma de <code>Order.total</code> de esa tienda.</p>
      </CardHeader>
      <CardContent className="!px-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-card-border text-xs text-text-tertiary">
              <tr>
                <th className="p-2 text-left">Tienda / Campaña</th>
                <th className="p-2 text-left">Proveedor</th>
                <th className="p-2 text-center">Estado</th>
                <th className="p-2 text-right">Productos</th>
                <th className="p-2 text-right">Pedidos</th>
                <th className="p-2 text-right">Ingresos</th>
                <th className="p-2 text-right">Part.</th>
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((c, i) => (
                <tr key={c.id} className="border-b border-card-border/60">
                  <td className="p-2 font-medium text-text-primary">{c.name}</td>
                  <td className="p-2"><Badge color="gray">{c.provider}</Badge></td>
                  <td className="p-2 text-center"><Badge color={c.active ? "success" : "gray"}>{c.active ? "Activa" : "Pausada"}</Badge></td>
                  <td className="p-2 text-right">{c.products}</td>
                  <td className="p-2 text-right">{c.orders}</td>
                  <td className="p-2 text-right font-bold text-brand-600">${c.revenue.toLocaleString("es-CL")}</td>
                  <td className="p-2 text-right">
                    <Badge color={i === 0 ? "primary" : "gray"}>{sharePct(c.revenue ?? 0, totalCampaignRevenue).toLocaleString("es-CL")}%</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-start gap-2">
          <InfoTip label="Próximo paso sugerido">
            Conectar Meta como provider para traer campañas pagas y ROAS. Hoy puedes medir qué tienda convierte mejor y reforzarla desde /admin/emails.
          </InfoTip>
        </div>
      </CardContent>
    </Card>
  );
}

export function MarketingDashboard() {
  const { data, isLoading } = useQuery<MarketingData>({
    queryKey: ["marketing"],
    queryFn: async () => (await fetch("/api/marketing")).json(),
  });

  if (isLoading) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Cargando marketing...</CardContent></Card>;
  if (!data) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Sin datos</CardContent></Card>;

  return (
    <div className="space-y-6">
      {/* 1. Título de página — arriba como las demás secciones */}
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-black dark:text-white">Campañas de Marketing</h2>
        <InfoTip label="¿Dónde se crean las campañas?">
          En <Link href="/store" className="underline">/store</Link> conecta Base de datos Cliente / Shopify / Woo / Magento / Cualquiera. Meta Integrado — hoy el catálogo alimenta el embudo y los canales (Starshop, Whatsapp, Tienda física). Meta se conecta como provider.
        </InfoTip>
      </div>

      {/* 2. Rendimiento de campañas */}
      <CampaignsHero data={data} />

      {/* 3. Embudo de conversión */}
      <MarketingFunnel data={data} />

      {/* 4-6. Resto: campañas por tienda, Meta Ads, canales + audiencia */}
      <div className="grid gap-4 md:grid-cols-3">
        <CampaignsDetail data={data} />
        <MetaConnectCard />
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
    </div>
  );
}
