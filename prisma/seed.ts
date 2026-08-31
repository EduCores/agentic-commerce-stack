import { prisma } from "../src/lib/adapters/prisma";

async function main() {
  const store = await prisma.storeConnection.upsert({
    where: { id: "seed-store" },
    update: {},
    create: {
      id: "seed-store",
      name: "Demo Store",
      provider: "mock",
      domain: "demo.acs.local",
      config: {},
    },
  });

  // Workaround: cuid id not seed-store? use slug for products? Create products via upsert on sku
  const storeId = store.id;

  const products = [
    { sku: "CHAIR-001", title: "Gaming Chair", price: 299.99, stock: 50, description: "Ergonomic gaming chair" },
    { sku: "MOUSE-001", title: "Wireless Mouse", price: 49.99, stock: 200, description: "Precision mouse" },
    { sku: "KB-001", title: "Mechanical Keyboard", price: 129.99, stock: 80, description: "RGB mechanical" },
    { sku: "MON-001", title: "4K Monitor", price: 399.99, stock: 30, description: "27\" 4K display" },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { storeId_sku: { storeId, sku: p.sku } },
      update: { title: p.title, price: p.price, stock: p.stock },
      create: { storeId, sku: p.sku, title: p.title, price: p.price, stock: p.stock, description: p.description, currency: "USD" },
    });
  }

  const wf = await prisma.workflowDefinition.upsert({
    where: { slug: "process-order" },
    update: {},
    create: {
      slug: "process-order",
      name: "Process Order",
      description: "Reserva stock → pago → fulfill",
      trigger: "eve_tool",
      graph: {
        nodes: [
          { id: "trigger-1", type: "base", position: { x: 250, y: 20 }, data: { label: "Order Created", type: "trigger", status: "idle" } },
          { id: "reserve-1", type: "base", position: { x: 250, y: 150 }, data: { label: "Reserve Stock", type: "reserve_stock", status: "idle" } },
          { id: "payment-1", type: "base", position: { x: 250, y: 280 }, data: { label: "Process Payment", type: "payment", status: "idle" } },
          { id: "fulfill-1", type: "base", position: { x: 250, y: 410 }, data: { label: "Fulfill Order", type: "fulfill", status: "idle" } },
        ],
        edges: [
          { id: "e1", source: "trigger-1", target: "reserve-1" },
          { id: "e2", source: "reserve-1", target: "payment-1" },
          { id: "e3", source: "payment-1", target: "fulfill-1" },
        ],
      },
      steps: ["RESERVE_STOCK", "PROCESS_PAYMENT", "FULFILL"],
    },
  });

  await prisma.agent.upsert({
    where: { slug: "sales-assistant" },
    update: {},
    create: {
      slug: "sales-assistant",
      name: "Sales Assistant",
      description: "Ayuda a vender, consulta stock y procesa compras",
      systemPrompt: "Eres asistente de ventas de ACS. Usa searchProducts, checkStock y processPurchase para ayudar.",
      model: "gpt-4o-mini",
      isActive: true,
      storeId,
    },
  });

  console.log("Seed done", { storeId, workflow: wf.slug });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
