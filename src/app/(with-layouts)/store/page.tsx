import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Badge } from "@/components/tailgrids/core/badge";
import { prisma } from "@/lib/adapters/prisma";
import { SyncButton } from "./_components/sync-button";
import { ConnectButton } from "./_components/connect-button";
import { Globe, Package, Store, Workflow } from "lucide-react";
import { InfoTip } from "@/components/tailgrids/core/info-tip";
import { resolveProductImage } from "@/utils/product-image";

export const dynamic = "force-dynamic";

type StoreConfig = {
  lastSync?: { at: string; synced: number; total: number; errors: number };
  lastHealthCheck?: { at: string; ok: boolean; total: number | null; latencyMs: number; error: string | null };
};

export default async function StorePage() {
  const stores = await prisma.storeConnection.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []);
  const products = await prisma.product.findMany({ take: 12, orderBy: { updatedAt: "desc" } }).catch(() => []);
  const primary = stores[0];
  const primaryHealth = ((primary?.config as unknown as StoreConfig | null)?.lastHealthCheck) ?? null;

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Almacenar", href: "/store" }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-black dark:text-white">Conexiones de tienda</h2>
          <p className="text-sm text-text-tertiary">Conecta tu tienda — Shopify, WooCommerce, Magento o personalizada. Un solo sistema para vender.</p>
        </div>
        <ConnectButton storeId={primary?.id} storeName={primary?.name ?? "tienda"} initial={primaryHealth} />
      </div>

      <div className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-badge-primary-background text-badge-primary-text [&>svg]:size-4">
                <Workflow size={16} />
              </span>
              <CardTitle>Conexiones ({stores.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {stores.length === 0 ? (
              <p className="text-sm text-text-tertiary">Sin conexiones. Crea una con provider `mock` para la demo, o `shopify` con dominio/apiKey.</p>
            ) : stores.map((s) => {
              const cfg = s.config as unknown as StoreConfig | null;
              const lastSync = cfg?.lastSync;
              const health = cfg?.lastHealthCheck;
              return (
                <div key={s.id} className="rounded-xl border border-card-border bg-card-background p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-sm [&>svg]:size-5">
                        <Store />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-text-primary">{s.name}</p>
                          <Badge color="gray">{s.provider}</Badge>
                          <Badge color={s.isActive ? "success" : "gray"}>{s.isActive ? "Activo" : "Inactivo"}</Badge>
                          {health && (
                            <Badge color={health.ok ? "success" : "error"}>
                              {health.ok ? `Conectada · ${health.total ?? "—"} prod · ${health.latencyMs}ms` : `Sin conexión`}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-text-tertiary">
                          <Globe className="size-3.5 shrink-0" />
                          {s.domain ? (
                            <a href={s.domain} target="_blank" rel="noreferrer" className="min-w-0 truncate underline hover:text-text-primary">{s.domain}</a>
                          ) : (
                            <span>—</span>
                          )}
                          {s.domain?.includes("localhost") && <Badge color="gray">desarrollo local</Badge>}
                        </p>
                        {health && !health.ok && (
                          <p className="mt-1 text-xs text-red-600">{health.error ?? "Error desconocido"}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 lg:w-72">
                      <SyncButton storeId={s.id} storeName={s.name} />
                      <p className="text-center text-xs text-text-tertiary lg:text-right">
                        {lastSync ? (
                          <>
                            Último sync: {new Date(lastSync.at).toLocaleString("es-CL")} · {lastSync.synced}/{lastSync.total}
                            {lastSync.errors > 0 && <span className="font-medium text-amber-700"> · {lastSync.errors} con error</span>}
                          </>
                        ) : (
                          "Sin sincronizar todavía"
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-badge-sky-background text-badge-sky-text [&>svg]:size-4">
                <Package size={16} />
              </span>
              <CardTitle>Catálogo universal ({products.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="text-sm text-text-tertiary">Sin productos. Ejecuta <code>prisma/seed.ts</code> o conecta tu tienda y sincroniza.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {products.map((p) => {
                  const stockState =
                    p.stock <= 0
                      ? { dot: "bg-red-500", badge: "Agotado" as const, color: "error" as const }
                      : p.stock < 10
                        ? { dot: "bg-teal-500", badge: "Bajo stock" as const, color: "success" as const }
                        : { dot: "bg-emerald-500", badge: "Disponible" as const, color: "success" as const };
                  const thumb = resolveProductImage(p.images);
                  return (
                    <div key={p.id} className="overflow-hidden rounded-lg border border-card-border bg-card-background transition hover:border-brand-500 hover:shadow-sm">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt={p.title} className="h-28 w-full object-cover" loading="lazy" />
                      ) : null}
                      <div className="p-3">
                      <div className="flex items-center justify-between gap-2.5">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-badge-sky-background text-badge-sky-text">
                          <Package size={18} />
                        </span>
                        <p className="shrink-0 text-sm font-extrabold text-brand-600">
                          ${Number(p.price).toLocaleString("es-CL")}
                        </p>
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-text-primary">
                        <span className={`size-2 shrink-0 rounded-full ${stockState.dot}`} title={stockState.badge} />
                        <span className="min-w-0 break-words">{p.title}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-text-tertiary">{p.sku}</p>
                      <div className="mt-2.5 flex items-center justify-between border-t border-card-border/60 pt-2 text-xs text-text-tertiary">
                        <span>Stock {p.stock} · Reservado {p.reservedStock}</span>
                        <Badge color={stockState.color}>{stockState.badge}</Badge>
                      </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Adaptador universal</CardTitle>
            <InfoTip label="Cómo funciona el adaptador">
              <code>src/lib/adapters/store.ts</code> expone <code>getProduct/checkStock/reserveStock/syncProducts</code> idéntico para cualquier provider. Agrega Shopify/Woo heredando <code>mockAdapter</code>.
            </InfoTip>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
