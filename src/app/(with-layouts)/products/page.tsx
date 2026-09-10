import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { prisma } from "@/lib/adapters/prisma";
import { CatalogTable, type CatalogRow } from "./_components/catalog-table";

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const where = q ? { OR: [{ sku: { contains: q, mode: "insensitive" as const } }, { title: { contains: q, mode: "insensitive" as const } }] } : {};
  const products = await prisma.product.findMany({ where: where as never, take: 50, orderBy: { updatedAt: "desc" }, include: { store: { select: { name: true, provider: true } } } }).catch(() => []);
  const providers = [...new Set(products.map((p) => p.store.provider))];
  const rows: CatalogRow[] = products.map((p) => ({
    id: String(p.id),
    sku: p.sku,
    title: p.title,
    description: p.description ?? "",
    provider: p.store.provider,
    price: Number(p.price),
    stock: p.stock,
    reservedStock: p.reservedStock,
    isActive: p.isActive,
  }));

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Productos", href: "/products" }]} />
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white">Productos — Catálogo híbrido</h2>
        <p className="text-sm text-text-tertiary">Híbrido: {providers.join(", ") || "mock"} · {products.length} productos · Una sola fuente en Prisma (te sirve para Shopify/Woo/Mock sin duplicar pantallas).</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Catálogo universal ({products.length})</CardTitle></CardHeader>
        <CardContent>
          <form className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input name="q" defaultValue={q} placeholder="Buscar SKU o título..." className="flex-1 rounded-lg border border-card-border bg-input-background px-3 py-2 text-sm text-text-primary [color-scheme:light] dark:[color-scheme:dark]" />
            <button type="submit" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white">Buscar</button>
            <a href="/products" className="rounded-lg border border-card-border px-4 py-2 text-center text-sm">Limpiar</a>
          </form>

          {products.length === 0 ? (
            <p className="text-sm text-text-tertiary">Sin productos. Ejecuta <code>npx tsx prisma/seed.ts</code> o sincroniza tu tienda híbrida.</p>
          ) : (
            <CatalogTable rows={rows} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Híbrido — cómo agregar tu proveedor real</CardTitle></CardHeader>
        <CardContent className="text-sm text-text-secondary space-y-1">
          <p><code>src/lib/adapters/store.ts</code> expone <code>getProduct/checkStock/reserveStock/syncProducts</code> idéntico para <code>mock/shopify/woocommerce/magento/custom</code>.</p>
          <p>Crea <code>StoreConnection</code> en <code>/store</code> con <code>provider: shopify</code> + <code>domain/apiKey</code>, luego <code>POST /api/store/sync</code> (próximo) hará la sincronización real.</p>
        </CardContent>
      </Card>
    </div>
  );
}
