// Limpieza de datos de prueba E2E en ACS:
//  - elimina órdenes de prueba (ORD-TEST-777, ORD-210209, ORD-880280, E2E-VERIFY-001)
//  - elimina clientes huérfanos
//  - elimina la tienda duplicada desactivada (cmtyoyyt...) y sus productos
// Deja solo seed-store (canónica, provider=starshop) con su catálogo.
import { prisma } from "@/lib/adapters/prisma";

async function main() {
  const testIds = ["ORD-TEST-777", "ORD-210209", "ORD-880280", "E2E-VERIFY-001"];
  const orders = await prisma.order.findMany({ where: { externalId: { in: testIds } }, select: { id: true } });
  const ids = orders.map((o) => o.id);
  const delOrders = ids.length ? await prisma.order.deleteMany({ where: { id: { in: ids } } }) : { count: 0 };
  console.log(`ordersDeleted=${delOrders.count}`);

  const customers = await prisma.customer.findMany({ select: { id: true } });
  let customersDeleted = 0;
  for (const c of customers) {
    const cnt = await prisma.order.count({ where: { customerId: c.id } });
    if (cnt === 0) {
      await prisma.customer.delete({ where: { id: c.id } });
      customersDeleted++;
    }
  }
  console.log(`customersDeleted=${customersDeleted}`);

  const prodDel = await prisma.product.deleteMany({ where: { store: { provider: "starshop", isActive: false } } });
  console.log(`dupStoreProductsDeleted=${prodDel.count}`);
  const delStores = await prisma.storeConnection.deleteMany({ where: { provider: "starshop", isActive: false } });
  console.log(`dupStoresDeleted=${delStores.count}`);

  const count = await prisma.product.count({ where: { storeId: "seed-store" } });
  const stores = await prisma.storeConnection.findMany({ select: { id: true, name: true, provider: true, isActive: true, domain: true } });
  console.log(`seedStoreProducts=${count}`);
  console.log("STORES=" + JSON.stringify(stores));
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });