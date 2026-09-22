import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Badge } from "@/components/tailgrids/core/badge";
import { prisma } from "@/lib/adapters/prisma";
import { SyncButton } from "./_components/sync-button";
import { ConnectButton } from "./_components/connect-button";
import { Package } from "lucide-react";

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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Conexiones ({stores.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 break-words">
            {stores.length === 0 ? (
              <p className="text-sm text-text-tertiary">Sin conexiones. Crea una con provider `mock` para la demo, o `shopify` con dominio/apiKey.</p>
            ) : stores.map((s) => (
              <div key={s.id} className="rounded-lg border border-card-border p-3 space-y-2 break-words">
                <p className="font-medium">{s.name} <Badge color="gray">{s.provider}</Badge></p>
                <p className="text-xs text-text-tertiary">{s.domain ?? "—"}</p>
                <Badge color={s.isActive ? "success" : "gray"}>{s.isActive ? "Activo" : "Inactivo"}</Badge>
                {(() => {
                  const cfg = s.config as unknown as StoreConfig | null;
                  const lastSync = cfg?.lastSync;
                  if (!lastSync) return <p className="text-xs text-text-tertiary">Sin sincronizar todavía.</p>;
                  return (
                    <p className="text-xs text-text-tertiary">
                      Último sync: {new Date(lastSync.at).toLocaleString("es-CL")} · {lastSync.synced}/{lastSync.total}
                      {lastSync.errors > 0 && <span className="font-medium text-amber-700"> · {lastSync.errors} con error — reintenta</span>}
                    </p>
                  );
                })()}
                {(() => {
                  const h = (s.config as unknown as StoreConfig | null)?.lastHealthCheck;
                  if (!h) return null;
                  return (
                    <Badge color={h.ok ? "success" : "gray"}>
                      {h.ok
                        ? `Conectada ✓ · ${h.total ?? "—"} productos · ${h.latencyMs}ms`
                        : `Sin conexión: ${h.error ?? "desconocido"}`}
                    </Badge>
                  );
                })()}
                <SyncButton storeId={s.id} storeName={s.name} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Catálogo universal ({products.length})</CardTitle></CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="text-sm text-text-tertiary">Sin productos. Ejecuta <code>prisma/seed.ts</code> o conecta tu tienda y sincroniza.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {products.map((p) => {
                  const stockState =
                    p.stock <= 0
                      ? { dot: "bg-red-500", badge: "Agotado" as const, color: "error" as const }
                      : p.stock < 10
                        ? { dot: "bg-amber-500", badge: "Bajo stock" as const, color: "warning" as const }
                        : { dot: "bg-emerald-500", badge: "Disponible" as const, color: "success" as const };
                  return (
                    <div key={p.id} className="rounded-lg border border-card-border bg-card-background p-3 transition hover:border-brand-500">
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
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Adaptador universal</CardTitle></CardHeader>
          <CardContent className="text-sm text-text-secondary break-words">
          <p><code>src/lib/adapters/store.ts</code> expone <code>getProduct/checkStock/reserveStock/syncProducts</code> idéntico para cualquier provider. Agrega Shopify/Woo heredando <code>mockAdapter</code>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
