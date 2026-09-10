import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Button } from "@/components/tailgrids/core/button";
import { Badge } from "@/components/tailgrids/core/badge";
import { prisma } from "@/lib/adapters/prisma";
import { SyncButton } from "./_components/sync-button";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const stores = await prisma.storeConnection.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []);
  const products = await prisma.product.findMany({ take: 12, orderBy: { updatedAt: "desc" } }).catch(() => []);

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Almacenar", href: "/store" }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-black dark:text-white">Conexiones de tienda</h2>
          <p className="text-sm text-text-tertiary">Conecta tu tienda — Shopify, WooCommerce, Magento o personalizada. Un solo sistema para vender.</p>
        </div>
        <Button appearance="fill" className="w-full shrink-0 whitespace-nowrap sm:w-auto">Conectar tienda</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Conexiones ({stores.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stores.length === 0 ? (
              <p className="text-sm text-text-tertiary">Sin conexiones. Crea una con provider `mock` para la demo, o `shopify` con dominio/apiKey.</p>
            ) : stores.map((s) => (
              <div key={s.id} className="rounded-lg border border-card-border p-3 space-y-2">
                <p className="font-medium">{s.name} <Badge color="gray">{s.provider}</Badge></p>
                <p className="text-xs text-text-tertiary">{s.domain ?? "—"}</p>
                <Badge color={s.isActive ? "success" : "gray"}>{s.isActive ? "Activo" : "Inactivo"}</Badge>
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
                {products.map((p) => (
                  <div key={p.id} className="rounded-lg border border-card-border p-3">
                    <p className="text-sm font-medium">{p.title} <span className="text-xs text-text-tertiary">({p.sku})</span></p>
                    <p className="text-xs text-text-tertiary">${Number(p.price)} — stock {p.stock} (reservado {p.reservedStock})</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Adaptador universal</CardTitle></CardHeader>
        <CardContent className="text-sm text-text-secondary">
          <p><code>src/lib/adapters/store.ts</code> expone <code>getProduct/checkStock/reserveStock/syncProducts</code> idéntico para cualquier provider. Agrega Shopify/Woo heredando <code>mockAdapter</code>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
