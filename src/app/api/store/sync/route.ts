import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { fetchStarshopProducts } from "@/lib/starshop";

export const dynamic = "force-dynamic";

/**
 * POST /api/store/sync — Sincronización real contra StarShop.
 * Body: { storeId: string }
 * 1) Lee el catálogo autoritativo de StarShop (GET /api/store/products)
 * 2) Upsert por (storeId, sku) preservando reservedStock local
 * 3) Registra lastSync en config como antes
 */
export async function POST(req: Request) {
  const { storeId } = await req.json().catch(() => ({}));
  if (!storeId) return NextResponse.json({ error: "storeId requerido" }, { status: 400 });

  const store = await prisma.storeConnection.findUnique({ where: { id: storeId } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const start = Date.now();
  let synced = 0;
  let errors = 0;
  let total = 0;

  try {
    if (store.provider === "starshop") {
      const { products } = await fetchStarshopProducts();
      total = products.length;
      for (const p of products) {
        try {
          const existing = await prisma.product.findFirst({ where: { storeId, sku: p.sku } });
          const data = {
            title: p.title,
            description: p.description ?? p.shortDescription ?? null,
            price: String(p.price ?? 0),
            compareAtPrice: p.compareAtPrice != null ? String(p.compareAtPrice) : null,
            currency: p.currency ?? "CLP",
            stock: Number(p.stock ?? 0),
            isActive: true,
            images: p.images ?? [],
            metadata: {
              externalId: p.externalId,
              category: p.category ?? null,
              subcategory: p.subcategory ?? null,
              brand: p.brand ?? null,
              secCertified: p.secCertified ?? false,
              discount: p.discount ?? null,
              url: p.url ?? null,
              syncedAt: new Date().toISOString(),
            },
          };
          if (existing) {
            // Preserva reservedStock local: solo actualiza disponibilidad/precio
            await prisma.product.update({ where: { id: existing.id }, data });
          } else {
            await prisma.product.create({ data: { storeId, sku: p.sku, ...data } });
          }
          synced++;
        } catch {
          errors++;
        }
      }
    } else {
      // Providers no-starshop: comportamiento anterior (enriquecer sin tocar precios/stock)
      const products = await prisma.product.findMany({ where: { storeId }, select: { id: true } });
      total = products.length;
      for (const p of products) {
        try {
          await prisma.product.update({ where: { id: p.id }, data: { updatedAt: new Date() } });
          synced++;
        } catch {
          errors++;
        }
      }
      // Si es mock y no había productos, crea 1 demo para que siempre haya algo que ver
      if (products.length === 0 && store.provider === "mock") {
        await prisma.product.create({
          data: {
            storeId,
            sku: `DEMO-${Date.now().toString().slice(-4)}`,
            title: "Producto Demo Sincronizado",
            description: "Creado por Sync para validar el flujo híbrido",
            price: 9990,
            currency: "CLP",
            stock: 10,
            metadata: { categoria: "Otros", categorySlug: "otros", syncedAt: new Date().toISOString() },
          },
        });
        synced = 1;
        total = 1;
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: `No se pudo leer el catálogo de StarShop: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }

  const ms = Date.now() - start;
  const lastSync = { at: new Date().toISOString(), synced, total, errors, ms };

  // Persiste el último sync en config (sin migración) para mostrar estado + reintento en /store
  const prevConfig = (store.config as Record<string, unknown> | null) ?? {};
  await prisma.storeConnection.update({
    where: { id: store.id },
    data: { config: { ...prevConfig, lastSync } },
  });

  return NextResponse.json({
    ok: true,
    store: { id: store.id, name: store.name, provider: store.provider },
    result: { total, synced, errors, ms },
    message: `Sincronizado ${synced} productos de ${store.name} (${store.provider}) en ${ms}ms${errors ? `, ${errors} con error` : ""}`,
  });
}

