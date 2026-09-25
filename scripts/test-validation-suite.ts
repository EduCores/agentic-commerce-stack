import { readFileSync } from "node:fs";

function loadEnv() {
  for (const raw of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

async function testAll() {
  console.log("=== 1. Validando Intent Router (Heurística) ===");
  const { detectIntentHeuristic } = await import("../src/lib/eve/detect-intent");
  const testCases: Array<{ text: string; expected: string; isAdmin?: boolean }> = [
    { text: "hola buenas tardes", expected: "general_inquiry" },
    { text: "tienes taladros inalámbricos?", expected: "product_search" },
    { text: "cuánto sale el envío a Santiago?", expected: "general_inquiry" },
    { text: "quiero devolver una compra defectuosa", expected: "return_request" },
    { text: "dónde está mi pedido #1234?", expected: "order_tracking" },
    { text: "puedo pagar con transferencia y finalizar la compra?", expected: "checkout_support" },
    { text: "necesito hablar con un humano o ejecutivo", expected: "escalate_human" },
    { text: "cuánto vendimos hoy y reporte de ventas", isAdmin: true, expected: "admin_ops" },
    { text: "compara el precio con la competencia", expected: "price_comparison" },
    { text: "dejé mi carrito abandonado quiero retomar compra", expected: "abandoned_cart" },
  ];

  let routerPass = 0;
  for (const tc of testCases) {
    const res = detectIntentHeuristic(tc.text, tc.isAdmin);
    const pass = res === tc.expected;
    if (pass) routerPass++;
    console.log(`  [${pass ? "OK" : "FAIL"}] "${tc.text}" -> ${res} (esperado: ${tc.expected})`);
  }
  console.log(`Router results: ${routerPass}/${testCases.length} pasados.\n`);
  if (routerPass !== testCases.length) throw new Error(`Fallaron ${testCases.length - routerPass} casos del router`);

  console.log("=== 2. Validando Tools Principales StarShop / ACS ===");
  const { default: searchProducts } = await import("../agent/tools/search-products");
  const { default: calculatePricing } = await import("../agent/tools/calculate-pricing");
  const { default: checkStock } = await import("../agent/tools/check-stock");
  const { default: navigateTo } = await import("../agent/tools/navigate");

  const searchRes = await searchProducts.execute({ storeId: "seed-store", query: "taladro", limit: 3 });
  console.log("Tool searchProducts resultado:", {
    found: searchRes.found,
    firstProduct: searchRes.products?.[0]?.title,
    sku: searchRes.products?.[0]?.sku,
    price: searchRes.products?.[0]?.price,
  });
  const skuTest = searchRes.products?.[0]?.sku;
  if (!skuTest) throw new Error("searchProducts no devolvió productos para validar");

  const priceRes1 = await calculatePricing.execute({ sku: skuTest, qty: 1, region: "Región Metropolitana" });
  console.log("Tool calculatePricing (RM 1 ud):", {
    sku: priceRes1.sku,
    title: priceRes1.title,
    unitPrice: priceRes1.unitPrice,
    shipping: priceRes1.shipping,
    total: priceRes1.total,
    shippingDays: priceRes1.shippingDays,
  });
  const priceRes2 = await calculatePricing.execute({ sku: skuTest, qty: 5, region: "Valparaíso" });
  console.log("Tool calculatePricing (Valparaíso 5 uds tier -8%):", {
    sku: priceRes2.sku,
    unitPrice: priceRes2.unitPrice,
    shipping: priceRes2.shipping,
    total: priceRes2.total,
    shippingDays: priceRes2.shippingDays,
  });

  const stockRes = await checkStock.execute({ storeId: "seed-store", sku: skuTest, qty: 1 });
  console.log("Tool checkStock resultado para", skuTest, ":", stockRes);

  const navRes = await navigateTo.execute({ path: "/busqueda", query: "multimetro" });
  console.log("Tool navigateTo resultado:", navRes);

  console.log("\n=== 3. Validando Agentes en Base de Datos Prisma ===");
  const { prisma } = await import("../src/lib/adapters/prisma");
  const agents = await prisma.agent.findMany({ select: { slug: true, name: true, model: true, isActive: true } });
  console.log(`Total agentes registrados en BD: ${agents.length}`);
  for (const agent of agents) {
    console.log(`  - [${agent.isActive ? "ACTIVO" : "INACTIVO"}] ${agent.slug} (${agent.name}) -> Modelo: ${agent.model}`);
  }

  const workflows = await prisma.workflowDefinition.findMany({ select: { name: true, slug: true, isActive: true } });
  console.log(`\nTotal workflows en BD: ${workflows.length}`);
  for (const workflow of workflows) {
    console.log(`  - [${workflow.isActive ? "ACTIVO" : "INACTIVO"}] ${workflow.slug} (${workflow.name})`);
  }

  await prisma.$disconnect();
  console.log("\nValidación completada exitosamente.");
}

testAll().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

