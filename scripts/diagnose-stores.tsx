// Diagnóstico + unificación de la conexión StarShop en ACS.
// Convierte seed-store en la conexión canónica provider=starshop y
// desactiva/elimina duplicados creados por orders-ingest si están vacíos.
import { prisma } from "@/lib/adapters/prisma";

async function main() {
  const stores = await prisma.storeConnection.findMany({ include: { _count: { select: { products: true, orders: true } } } });
  console.log("=== STORES ===");
  for (const s of stores) {
    console.log(`${s.id} | ${s.name} | provider=${s.provider} | domain=${s.domain} | products=${s._count.products} | orders=${s._count.orders} | active=${s.isActive}`);
  }

  // 1) seed-store → conexión StarShop canónica
  const domain = process.env.STARSHOP_API_URL ?? "http://localhost:3000";
  const seed = stores.find((s) => s.id === "seed-store");
  if (seed) {
    await prisma.storeConnection.update({
      where: { id: seed.id },
      data: { name: "Starshop Frontend", provider: "starshop", domain },
    });
    console.log("→ seed-store actualizada a provider=starshop");
  }

  // 2) Duplicados starshop (id != seed-store) sin órdenes → eliminar; con órdenes → desactivar
  for (const s of stores.filter((x) => x.provider === "starshop" && x.id !== "seed-store")) {
    if (s._count.orders === 0) {
      await prisma.product.deleteMany({ where: { storeId: s.id } });
      await prisma.storeConnection.delete({ where: { id: s.id } });
      console.log(`→ eliminada duplicada ${s.id} (${s._count.products} productos, 0 órdenes)`);
    } else {
      await prisma.storeConnection.update({ where: { id: s.id }, data: { isActive: false } });
      console.log(`→ duplicada ${s.id} con ${s._count.orders} órdenes → desactivada`);
    }
  }

  const finalStores = await prisma.storeConnection.findMany();
  console.log("=== FINAL ===");
  for (const s of finalStores) console.log(`${s.id} | ${s.name} | provider=${s.provider}`);

  const p = await prisma.product.findFirst({ where: { storeId: "seed-store", sku: "LED-PRO-200W-IP66" } });
  console.log("=== SYNCED PRODUCT p001 ===");
  console.log(`externalId=${p?.externalId}`);
  console.log(`title=${p?.title}`);
  console.log(`stock=${p?.stock} reserved=${p?.reservedStock}`);
  console.log(`metadataKeys=${p?.metadata ? Object.keys(p.metadata).join(",") : "none"}`);
  const meta = p?.metadata as Record<string, unknown> | null;
  console.log(`categorySlug=${meta?.categorySlug}`);
  console.log(`tags=${Array.isArray(meta?.tags) ? (meta.tags as string[]).join("|") : "none"}`);
  console.log(`syncedAt=${meta?.syncedAt}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });