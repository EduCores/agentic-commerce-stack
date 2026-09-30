"use client";

import { Fragment, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { MarketingFunnel } from "./funnel";
import { MarketingChannelTable, ChannelIcon } from "./channel-table";
import { InfoTip } from "@/components/tailgrids/core/info-tip";
import { sharePct } from "@/utils/period-stats";
import type { MarketingData } from "./types";
import Link from "next/link";
import { Megaphone, Package, Store, TrendingUp, Users } from "lucide-react";
import { MetaConnectCard } from "./meta-connect-card";

function CampaignsHero({ data }: { data: MarketingData }) {
  const totalProducts = data.campaigns.reduce((a, c) => a + c.products, 0);
  const active = data.campaigns.filter((c) => c.active).length;
  return (
    <div className="overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-primary-500 p-6 text-white md:col-span-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="mt-2.5 flex items-center gap-2 text-sm font-bold tracking-[-0.2px]">
            <span className="flex size-7 items-center justify-center rounded-lg bg-white/15 [&>svg]:size-4">
              <Megaphone />
            </span>
            Rendimiento de campañas
            <InfoTip tone="dark" label="Cómo se arman las campañas">
              Catálogo híbrido: cada tienda conectada es una campaña. Datos compartidos por StoreConnection (productos + pedidos por tienda).
            </InfoTip>
          </h3>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-[4px] bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white">
            <span className={`size-1.5 rounded-full ${data.live ? "bg-emerald-300" : "bg-amber-300"}`} />
            {data.live ? "Datos reales — tienda conectada" : "Modo mock — conecta para datos reales"}
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
      <Card className="min-w-0">
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
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Campañas por tienda — desglose real</CardTitle>
          <div className="flex items-center gap-2">
            <Link href="/store" className="text-xs font-medium text-brand-600 underline">Gestionar en /store →</Link>
            <InfoTip label="Cómo se calculan los datos">
              Cada fila es una tienda conectada. Productos y pedidos vienen por <code>storeId</code>; ingresos = suma de <code>Order.total</code> de esa tienda.
            </InfoTip>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {data.campaigns.map((c, i) => {
            const pct = sharePct(c.revenue ?? 0, totalCampaignRevenue);
            return (
              <Fragment key={c.id}>
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-badge-violet-background text-badge-violet-text [&>svg]:size-5">
                    <Store />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">{c.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge color="gray">{c.provider}</Badge>
                      <Badge color={c.active ? "success" : "gray"}>{c.active ? "Activa" : "Pausada"}</Badge>
                    </div>
                  </div>
                  <Badge color={i === 0 ? "primary" : "gray"}>{pct.toLocaleString("es-CL")}%</Badge>
                </div>
                <p className="mt-3 text-2xl font-extrabold tracking-tight text-brand-600">
                  ${c.revenue.toLocaleString("es-CL")}
                  <span className="ml-2 align-middle text-xs font-medium text-text-tertiary">ingresos</span>
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background-gray-secondary">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2.5 flex items-center gap-4 border-t border-card-border/60 pt-2 text-xs text-text-tertiary">
                  <span><strong className="text-text-primary">{c.products}</strong> productos</span>
                  <span><strong className="text-text-primary">{c.orders}</strong> pedidos</span>
                </div>
              </Fragment>
            );
          })}
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

function StoresSummary({ data }: { data: MarketingData }) {
  const totalRevenue = data.campaigns.reduce((a, c) => a + (c.revenue ?? 0), 0);
  const totalOrders = data.campaigns.reduce((a, c) => a + (c.orders ?? 0), 0);
  const totalProducts = data.campaigns.reduce((a, c) => a + (c.products ?? 0), 0);
  const active = data.campaigns.filter((c) => c.active).length;
  const best = [...data.campaigns].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))[0];
  const bestPct = best ? sharePct(best.revenue ?? 0, totalRevenue) : 0;
  const rows: { label: ReactNode; value: ReactNode }[] = [
    { label: "Ingresos totales", value: <span className="text-xs font-bold text-brand-600">${totalRevenue.toLocaleString("es-CL")}</span> },
    { label: "Pedidos", value: <span className="text-xs font-bold text-text-primary">{totalOrders.toLocaleString("es-CL")}</span> },
    { label: "Productos en catálogo", value: <span className="text-xs font-bold text-text-primary">{totalProducts.toLocaleString("es-CL")}</span> },
    { label: "Tiendas activas", value: <span className="flex shrink-0 items-center gap-2"><Badge color={active > 0 ? "success" : "gray"}>{active}/{data.campaigns.length}</Badge></span> },
  ];
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-badge-sky-background text-badge-sky-text [&>svg]:size-4">
              <Store />
            </span>
            <CardTitle className="text-sm">Resumen de tiendas</CardTitle>
          </div>
          <Link href="/store" className="text-xs font-medium text-brand-600 underline">Gestionar en /store →</Link>
        </div>
      </CardHeader>
      <CardContent>
        {data.campaigns.length === 0 ? (
          <p className="text-sm text-text-tertiary">Sin tiendas conectadas. Crea la primera en /store.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-card-border/60 px-3 py-2 text-sm">
                <span className="min-w-0 truncate text-text-primary">{r.label}</span>
                {r.value}
              </div>
            ))}
            {best && (
              <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-card-border/60 px-3 py-2 text-sm">
                <span className="min-w-0 truncate text-text-primary">Mejor tienda: <strong>{best.name}</strong></span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-bold text-brand-600">${(best.revenue ?? 0).toLocaleString("es-CL")}</span>
                  <span className="rounded-[4px] bg-badge-violet-background px-2 py-0.5 text-xs font-bold text-badge-violet-text">
                    {bestPct.toLocaleString("es-CL")}%
                  </span>
                </span>
              </div>
            )}
          </div>
        )}
        <p className="mt-3 border-t border-card-border pt-3 text-xs text-text-tertiary">
          Cada tienda conectada es una campaña. Refuerza la que más convierte desde /admin/emails.
        </p>
      </CardContent>
    </Card>
  );
}

function AudienceCard({ data }: { data: MarketingData }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-badge-sky-background text-badge-sky-text [&>svg]:size-4">
            <Users />
          </span>
          <CardTitle className="text-sm">Información de la audiencia</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-text-secondary">
        <p>
          <strong className="text-2xl font-extrabold tracking-tight text-text-primary">
            {(data.audience?.customers ?? 0).toLocaleString("es-CL")}
          </strong>{" "}
          <span className="text-text-tertiary">compradores únicos</span>
        </p>
        <div className="mt-3 space-y-1.5">
          {(data.audience?.byChannel ?? []).slice(0, 4).map((a) => (
            <div key={a.channel} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-card-border/60 px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <ChannelIcon name={a.channel} />
                <span className="min-w-0 truncate">{a.channel}</span>
              </span>
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

      {/* Campañas + resumen — 50/50 en md+ */}
      <div className="grid gap-4 md:grid-cols-2">
        <CampaignsDetail data={data} />
        <StoresSummary data={data} />
      </div>

      {/* Audiencia + Rendimiento por canal — 50/50 forzado en md+ */}
      <div className="grid gap-4 md:grid-cols-2">
        <AudienceCard data={data} />
        <MarketingChannelTable data={data} />
      </div>

      {/* Meta a ancho completo */}
      <MetaConnectCard />
    </div>
  );
}
