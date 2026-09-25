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
  const testCases = [
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

  console.log("=== 2. Validando Tools Principales StarShop / ACS ===");
  const { default: searchProducts } = await import("../agent/tools/search-products");
  const { default: calculatePricing } = await import("../agent/tools/calculate-pricing");
  const { default: checkStock } = await import("../agent/tools/check-stock");
  const { default: navigateTo } = await import("../agent/tools/navigate");

  // Probar searchProducts
  const searchRes = await (searchProducts as any).execute({ query: "taladro", limit: 3 });
  console.log("Tool searchProducts resultado:", {
    total: searchRes.total,
    firstProduct: searchRes.products?.[0]?.name,
    sku: searchRes.products?.[0]?.sku,
    price: searchRes.products?.[0]?.price,
  });

  // Probar calculatePricing para RM con envío gratis (>= 49990) y con flete
  const skuTest = searchRes.products?.[0]?.sku;
  if (skuTest) {
    const priceRes1 = await (calculatePricing as any).execute({
      sku: skuTest,
      qty: 1,
      region: "Región Metropolitana",
    });
    console.log("Tool calculatePricing (RM 1 ud):", {
      sku: priceRes1.sku,
      title: priceRes1.title,
      unitPrice: priceRes1.unitPrice,
      shipping: priceRes1.shipping,
      total: priceRes1.total,
      shippingDays: priceRes1.shippingDays,
    });

    const priceRes2 = await (calculatePricing as any).execute({
      sku: skuTest,
      qty: 5,
      region: "Valparaíso",
    });
    console.log("Tool calculatePricing (Valparaíso 5 uds tier -8%):", {
      sku: priceRes2.sku,
      unitPrice: priceRes2.unitPrice,
      shipping: priceRes2.shipping,
      total: priceRes2.total,
      shippingDays: priceRes2.shippingDays,
    });
  }

  // Probar checkStock
  if (skuTest) {
    const stockRes = await (checkStock as any).execute({ sku: skuTest, qty: 1 });
    console.log("Tool checkStock resultado para", skuTest, ":", stockRes);
  }

  // Probar navigateTo
  const navRes = await (navigateTo as any).execute({ path: "/busqueda", query: "multimetro" });
  console.log("Tool navigateTo resultado:", navRes);

  console.log("\n=== 3. Validando Agentes en Base de Datos Prisma ===");
  const { prisma } = await import("../src/lib/adapters/prisma");
  const agents = await prisma.agent.findMany({
    select: { slug: true, name: true, model: true, isActive: true },
  });
  console.log(`Total agentes registrados en BD: ${agents.length}`);
  for (const a of agents) {
    console.log(`  - [${a.isActive ? "ACTIVO" : "INACTIVO"}] ${a.slug} (${a.name}) -> Modelo: ${a.model}`);
  }

  const workflows = await prisma.workflowDefinition.findMany({
    select: { name: true, slug: true, isActive: true },
  });
  console.log(`\nTotal workflows en BD: ${workflows.length}`);
  for (const w of workflows) {
    console.log(`  - [${w.isActive ? "ACTIVO" : "INACTIVO"}] ${w.slug} (${w.name})`);
  }

  await prisma.$disconnect();
  console.log("\nValidación completada exitosamente.");
}

testAll().catch(console.error);
