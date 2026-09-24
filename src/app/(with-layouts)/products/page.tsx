import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { prisma } from "@/lib/adapters/prisma";
import Link from "next/link";
import { CatalogTable, type CatalogRow } from "./_components/catalog-table";
import { InfoTip } from "@/components/tailgrids/core/info-tip";
import { Boxes, Package, Store, Box, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const where = q ? { OR: [{ sku: { contains: q, mode: "insensitive" as const } }, { title: { contains: q, mode: "insensitive" as const } }] } : {};
  const products = await prisma.product.findMany({ where: where as never, take: 50, orderBy: { updatedAt: "desc" }, include: { store: { select: { name: true, provider: true } } } }).catch(() => []);
  const providers = [...new Set(products.map((p) => p.store.provider))];
  const totalStock = products.reduce((a, p) => a + p.stock, 0);
  const lowStock = products.filter((p) => p.stock < 10).length;
  const activeCount = products.filter((p) => p.isActive).length;
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
    <div className="min-w-0 space-y-6 overflow-hidden p-3 sm:p-6">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Productos", href: "/products" }]} />
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold tracking-tight text-black dark:text-white">Productos — Catálogo híbrido</h2>
        <InfoTip label="Acerca del catálogo">
          Unifica Shopify, WooCommerce, Magento y mock en una sola fuente Prisma. Busca, filtra y opera sin duplicar pantallas.
        </InfoTip>
      </div>

      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-primary-600 p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="mt-2.5 flex items-center gap-2 text-sm font-bold tracking-[-0.2px]">
              <span className="flex size-7 items-center justify-center rounded-lg bg-white/15 text-white [&>svg]:size-4">
                <Package />
              </span>
              Catálogo universal
              <InfoTip tone="dark" label="Detalle del catálogo">
                {providers.join(" · ") || "mock"} · {products.length} productos · Stock total {totalStock.toLocaleString("es-CL")} · Actualizado desde Prisma
              </InfoTip>
            </h3>
          </div>
          <Badge color="success" className="border-white/20 bg-white/15 text-white backdrop-blur">Híbrido activo</Badge>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/10 p-4 backdrop-blur">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white [&>svg]:size-6">
              <Boxes />
            </span>
            <div>
              <p className="text-xs font-medium text-white/80">Productos</p>
              <p className="text-2xl font-extrabold tracking-tight">{products.length.toLocaleString("es-CL")}</p>
              <p className="text-xs text-white/70">{activeCount} activos · {products.length - activeCount} inactivos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white/10 p-4 backdrop-blur">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white [&>svg]:size-6">
              <Store />
            </span>
            <div>
              <p className="text-xs font-medium text-white/80">Proveedores</p>
              <p className="text-2xl font-extrabold tracking-tight">{providers.length}</p>
              <p className="text-xs text-white/70">{providers.slice(0, 3).join(", ") || "mock"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white/10 p-4 backdrop-blur">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white [&>svg]:size-6">
              <Box />
            </span>
            <div>
              <p className="text-xs font-medium text-white/80">Stock</p>
              <p className="text-2xl font-extrabold tracking-tight">{totalStock.toLocaleString("es-CL")} uds</p>
              <p className="text-xs text-white/70">{lowStock} con stock bajo · disponibilidad inmediata</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-badge-sky-background text-badge-sky-text [&>svg]:size-4">
              <Package size={16} />
            </span>
            <CardTitle>Catálogo universal ({products.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="min-w-0">
          <form className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <input name="q" defaultValue={q} placeholder="Buscar SKU o título..." className="w-full rounded-lg border border-card-border bg-input-background px-3 py-2 pl-10 pr-4 text-sm text-text-primary [color-scheme:light] dark:[color-scheme:dark]" />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </span>
            </div>
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-bold text-black hover:bg-brand-600">Buscar</button>
            <Link href="/products" className="rounded-lg border border-card-border bg-card-background px-4 py-2 text-center text-sm font-medium hover:bg-background-gray-secondary">Limpiar</Link>
          </form>

          {products.length === 0 ? (
            <p className="text-sm text-text-tertiary">Sin productos. Ejecuta <code>npx tsx prisma/seed.ts</code> o sincroniza tu tienda híbrida.</p>
          ) : (
            <CatalogTable rows={rows} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-badge-violet-background text-badge-violet-text [&>svg]:size-4">
              <Sparkles size={16} />
            </span>
            <CardTitle>Híbrido — proveedor real</CardTitle>
            <InfoTip label="Cómo agregar tu proveedor real">
              <code>src/lib/adapters/store.ts</code> expone getProduct, checkStock, reserveStock y syncProducts idéntico para mock/shopify/woocommerce/magento/custom. Crea un StoreConnection en /store con provider + domain/apiKey y sincroniza: todo queda en una sola tabla Product.
            </InfoTip>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
