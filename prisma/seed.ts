import "dotenv/config";
import { prisma } from "../src/lib/adapters/prisma";
import { SALES_SYSTEM_PROMPT } from "./sales-system-prompt";
import { STARSHOP_CREW_MODEL, STARSHOP_CREWS, STARSHOP_WELCOME_PROMPT } from "./starshop-prompts";
import { starShopRouterGraph, starShopRouterSteps } from "../src/workflows/starshop-router";
import { emailAgentGraph, emailAgentSteps } from "../src/workflows/email-agent";
import { normalize, tokenize } from "../agent/lib/search/normalize";
import { STARSHOP_CATEGORIES } from "../agent/lib/search/categories";

// ═══════════════════════════════════════════════════════════════════
// Catálogo de referencia (solo se siembra si la BD está vacía).
// Si ya existen productos (p.ej. el catálogo StarShop real), NO se
// borran: en su lugar se enriquecen con metadata para la búsqueda.
// ═══════════════════════════════════════════════════════════════════

import { fallbackProducts, type SeedProduct } from "./catalog";

/** Detecta categoría/categorySlug de un producto por su título/SKU. */
function detectCategory(title: string, sku: string): { categoria: string; categorySlug: string } {
  const text = normalize(`${title} ${sku}`);
  for (const cat of STARSHOP_CATEGORIES) {
    const hit = cat.keywords.some((kw) => text.includes(kw));
    if (hit) return { categoria: cat.name, categorySlug: cat.slug };
  }
  return { categoria: "Otros", categorySlug: "otros" };
}

/** Deriva tags relevantes del título (tokens + specs numéricas). */
function deriveTags(title: string, sku: string): string[] {
  const tags = new Set<string>();
  for (const token of tokenize(`${title} ${sku}`)) {
    if (token.length >= 3) tags.add(token);
  }
  // specs comunes: watt, medidas, voltaje
  for (const match of title.toLowerCase().match(/\b\d+(?:w|v|mm|cm|m|a|mah|k)\b/g) ?? []) {
    tags.add(match);
  }
  return Array.from(tags).slice(0, 12);
}

/** Aliases coloquiales comunes por presencia de palabras clave. */
function deriveAliases(title: string): string[] {
  const t = normalize(title);
  const aliases: string[] = [];
  const map: [RegExp, string][] = [
    [/proyector/, "reflector led, luces de obra, spot exterior"],
    [/taladro/, "taladradora, drill, taladro percutor"],
    [/multimetro/, "tester, multitester, polimetro"],
    [/pinza.*amperimetrica|amperimetrica/, "pinza amperimetrica, tester de corriente"],
    [/tubo.*uv|uv.*tubo|uv-c/, "tubo uv, lampara ultravioleta, luz germicida"],
    [/panel led/, "panel plafon, luminaria emporable, panel cielo"],
    [/sierra/, "sierra circular, sierra calar"],
    [/cautin/, "estacion de soldado, soldador"],
    [/medidor.*laser|laser.*medidor/, "metro laser, distanciometro, medidor laser"],
    [/termografica|termica/, "camara termica, pirometro"],
    [/bateria|litio|18650/, "celda recargable, bateria recargable"],
  ];
  for (const [re, vals] of map) {
    if (re.test(t)) aliases.push(vals);
  }
  return aliases;
}
// Catálogo de referencia en ./catalog.ts (compartido con prisma/seed-demo.ts)

// Catálogo movido a ./catalog.ts — compartido con prisma/seed-demo.ts

async function main() {
  // 1) Tienda StarShop (upsert, no destructivo): conexión real al frontend.
  //    provider "starshop" → /api/store/sync hace pull real del catálogo.
  const store = await prisma.storeConnection.upsert({
    where: { id: "seed-store" },
    update: { name: "Starshop Frontend", provider: "starshop", domain: process.env.STARSHOP_API_URL ?? "http://localhost:3000" },
    create: { id: "seed-store", name: "Starshop Frontend", provider: "starshop", domain: process.env.STARSHOP_API_URL ?? "http://localhost:3000", config: {} },
  });
  const storeId = store.id;

  // 2) Catálogo: si ya hay productos (catálogo real StarShop), NO borrar.
  //    Solo enriquecer metadata (categoria, categorySlug, aliases, tags).
  const existing = await prisma.product.findMany({ where: { storeId }, select: { id: true, sku: true, title: true } });
  console.log(`[seed] ${existing.length} producto(s) existente(s) en "${storeId}".`);

  if (existing.length > 0) {
    // Enriquecer metadata sin tocar precio/stock/títulos
    let updated = 0;
    for (const p of existing) {
      const { categoria, categorySlug } = detectCategory(p.title, p.sku);
      await prisma.product.update({
        where: { id: p.id },
        data: {
          metadata: {
            categoria,
            categorySlug,
            aliases: deriveAliases(p.title),
            tags: deriveTags(p.title, p.sku),
          },
        },
      });
      updated += 1;
    }
    console.log(`[seed] metadata enriquecida para ${updated} producto(s).`);
  } else {
    await prisma.product.createMany({
      data: fallbackProducts.map((p) => ({
        storeId,
        sku: p.sku,
        title: p.title,
        description: p.description,
        price: p.price,
        currency: "CLP",
        stock: p.stock,
        metadata: {
          categoria: p.categoria,
          categorySlug: p.categorySlug,
          aliases: p.aliases,
          tags: p.tags,
        },
      })),
      skipDuplicates: true,
    });
    console.log(`[seed] catálogo de referencia sembrado (${fallbackProducts.length} SKUs).`);
  }

  // 3) Workflow de compra (upsert, idempotente)
  await prisma.workflowDefinition.upsert({
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

  // 4) Agente: actualizar SOLO el prompt anti-alucinación; respeta el modelo configurado
  const agent = await prisma.agent.upsert({
    where: { slug: "sales-assistant" },
    update: { systemPrompt: SALES_SYSTEM_PROMPT, model: STARSHOP_CREW_MODEL, storeId, isActive: true },
    create: {
      slug: "sales-assistant",
      name: "Sales Assistant",
      description: "Ayuda a vender, consulta stock y procesa compras",
      systemPrompt: SALES_SYSTEM_PROMPT,
      model: STARSHOP_CREW_MODEL,
      isActive: true,
      storeId,
    },
  });

  // 5) Workflow StarShop Router 1→2→6+3→4 (grafo XYFlow)
  // El grafo y el estado de publicación se CONSERVAN al re-sembrar: las ediciones
  // hechas en /workflows son la fuente de configuración del router (ver agent/lib/crew-graph.ts).
  await prisma.workflowDefinition.upsert({
    where: { slug: "starshop-intent-router" },
    update: { steps: starShopRouterSteps },
    create: {
      slug: "starshop-intent-router",
      name: "StarShop Intent Router",
      description: "1 Welcome → 2 Route By Intent → 3.x Crews (6+3) → 4 Confirm Order",
      trigger: "eve_tool",
      graph: starShopRouterGraph,
      steps: starShopRouterSteps,
    },
  });

  // 5b) Workflow Email Agent — emails automáticos por evento (2FA/reset/pedido).
  // El grafo y el estado de publicación se CONSERVAN al re-sembrar (mismo criterio
  // que el router: las ediciones en /workflows son la fuente de configuración).
  await prisma.workflowDefinition.upsert({
    where: { slug: "email-agent" },
    update: { steps: emailAgentSteps },
    create: {
      slug: "email-agent",
      name: "Email Agent",
      description: "Evento → validar destinatario → renderizar plantilla → enviar (Resend/mock)",
      trigger: "eve_tool",
      graph: emailAgentGraph,
      steps: emailAgentSteps,
    },
  });

  // 6) Crews StarShop — 8 agents (Welcome + 6 + OrderTracking + Escalate) + Confirm
  const welcomeAgent = await prisma.agent.upsert({
    where: { slug: "starshop-welcome" },
    update: { systemPrompt: STARSHOP_WELCOME_PROMPT, model: STARSHOP_CREW_MODEL, storeId, isActive: true },
    create: { slug: "starshop-welcome", name: "StarShop Welcome Agent", description: "Greet y detecta intent (paso 1)", systemPrompt: STARSHOP_WELCOME_PROMPT, model: STARSHOP_CREW_MODEL, isActive: true, storeId },
  });

  const crews = Object.values(STARSHOP_CREWS);
  for (const crew of crews) {
    await prisma.agent.upsert({
      where: { slug: crew.slug },
      update: { systemPrompt: crew.prompt, name: crew.name, description: crew.description, model: crew.model, isActive: true, storeId },
      create: { slug: crew.slug, name: crew.name, description: crew.description, systemPrompt: crew.prompt, model: crew.model, isActive: true, storeId },
    });
  }

  console.log("Seed done", { storeId, products: existing.length || fallbackProducts.length, agent: agent.slug, welcome: welcomeAgent.slug, crews: crews.length, router: "starshop-intent-router" });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
