import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Badge } from "@/components/tailgrids/core/badge";
import { prisma } from "@/lib/adapters/prisma";

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const where = q ? { OR: [{ sku: { contains: q, mode: "insensitive" as const } }, { title: { contains: q, mode: "insensitive" as const } }] } : {};
  const products = await prisma.product.findMany({ where: where as never, take: 50, orderBy: { updatedAt: "desc" }, include: { store: { select: { name: true, provider: true } } } }).catch(() => []);
  const providers = [...new Set(products.map((p) => p.store.provider))];

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Productos", href: "/products" }]} />
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white">Productos — Catálogo híbrido</h2>
        <p className="text-sm text-text-tertiary">Híbrido: {providers.join(", ") || "mock"} · {products.length} productos · Fuente única Prisma (sirve para Shopify/Woo/Mock sin duplicar UI).</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Catálogo universal ({products.length})</CardTitle></CardHeader>
        <CardContent>
          <form className="mb-4 flex gap-2">
            <input name="q" defaultValue={q} placeholder="Buscar SKU o título..." className="flex-1 rounded-lg border border-card-border bg-input-background px-3 py-2 text-sm text-text-primary [color-scheme:light] dark:[color-scheme:dark]" />
            <button type="submit" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white">Buscar</button>
            <a href="/products" className="rounded-lg border border-card-border px-4 py-2 text-sm">Limpiar</a>
          </form>

          {products.length === 0 ? (
            <p className="text-sm text-text-tertiary">Sin productos. Corre <code>npx tsx prisma/seed.ts</code> o sincroniza tu tienda híbrida.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-text-tertiary border-b border-card-border">
                  <tr><th className="text-left p-2">SKU</th><th className="text-left p-2">Producto</th><th className="text-left p-2">Provider</th><th className="text-right p-2">Precio</th><th className="text-right p-2">Stock</th><th className="text-center p-2">Estado</th></tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-card-border/60 hover:bg-background-gray-secondary">
                      <td className="p-2 font-mono text-xs">{p.sku}</td>
                      <td className="p-2"><p className="font-medium">{p.title}</p><p className="text-xs text-text-tertiary truncate max-w-[320px]">{p.description ?? ""}</p></td>
                      <td className="p-2"><Badge color="gray">{p.store.provider}</Badge></td>
                      <td className="p-2 text-right">${Number(p.price).toLocaleString("es-CL")}</td>
                      <td className="p-2 text-right">{p.stock} <span className="text-xs text-text-tertiary">({p.reservedStock} res)</span></td>
                      <td className="p-2 text-center"><Badge color={p.isActive ? "success" : "gray"}>{p.isActive ? "Activo" : "Inactivo"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Híbrido — cómo agregar tu proveedor real</CardTitle></CardHeader>
        <CardContent className="text-sm text-text-secondary space-y-1">
          <p><code>src/lib/adapters/store.ts</code> expone <code>getProduct/checkStock/reserveStock/syncProducts</code> idéntico para <code>mock/shopify/woocommerce/magento/custom</code>.</p>
          <p>Crea <code>StoreConnection</code> en <code>/store</code> con <code>provider: shopify</code> + <code>domain/apiKey</code>, luego <code>POST /api/store/sync</code> (próximo) hará pull real.</p>
        </CardContent>
      </Card>
    </div>
  );
}
