import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Button } from "@/components/tailgrids/core/button";
import { Badge } from "@/components/tailgrids/core/badge";
import { prisma } from "@/lib/adapters/prisma";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const stores = await prisma.storeConnection.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []);
  const products = await prisma.product.findMany({ take: 12, orderBy: { updatedAt: "desc" } }).catch(() => []);

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Store", href: "/store" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-black dark:text-white">Store Connections</h2>
          <p className="text-sm text-text-tertiary">Conecta cualquier tienda — Shopify, WooCommerce, Magento o custom. Un solo software para vender.</p>
        </div>
        <Button appearance="fill">Conectar tienda</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Conexiones ({stores.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stores.length === 0 ? (
              <p className="text-sm text-text-tertiary">Sin tiendas. Crea una con provider `mock` para demo, o `shopify` con dominio/apiKey.</p>
            ) : stores.map((s) => (
              <div key={s.id} className="rounded-lg border border-card-border p-3">
                <p className="font-medium">{s.name} <Badge color="gray">{s.provider}</Badge></p>
                <p className="text-xs text-text-tertiary">{s.domain ?? "—"}</p>
                <Badge className="mt-1" color={s.isActive ? "success" : "gray"}>{s.isActive ? "Activa" : "Inactiva"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Catálogo universal ({products.length})</CardTitle></CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="text-sm text-text-tertiary">Sin productos. Corre <code>prisma/seed.ts</code> o conecta tu tienda y haz sync.</p>
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
