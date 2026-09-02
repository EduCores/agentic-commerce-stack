import { prisma } from "../src/lib/adapters/prisma";
import { SALES_SYSTEM_PROMPT } from "./sales-system-prompt";
import { normalize, tokenize } from "../agent/lib/search/normalize";
import { STARSHOP_CATEGORIES } from "../agent/lib/search/categories";

// ═══════════════════════════════════════════════════════════════════
// Catálogo de referencia (solo se siembra si la BD está vacía).
// Si ya existen productos (p.ej. el catálogo StarShop real), NO se
// borran: en su lugar se enriquecen con metadata para la búsqueda.
// ═══════════════════════════════════════════════════════════════════

type SeedProduct = {
  sku: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  categoria: string;
  categorySlug: string;
  aliases: string[];
  tags: string[];
};

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
// ═══════════════════════════════════════════════════════════════════
// CATÁLOGO DE REFERENCIA (solo si no hay productos en la tienda)
// ═══════════════════════════════════════════════════════════════════

const fallbackProducts: SeedProduct[] = [
  {
    sku: "PROY-LED-200W",
    title: "Proyector LED 200W IP66",
    description: "Proyector LED de 200W, IP66, para exteriores, fachadas y obras.",
    price: 54990,
    stock: 36,
    categoria: "Iluminación LED y Neón",
    categorySlug: "iluminacion-led-neon",
    aliases: ["reflector led", "luces de obra", "spot exterior", "luz de fachada"],
    tags: ["led", "200w", "ip66", "exterior", "obra"],
  },
  {
    sku: "TALADRO-13MM",
    title: "Taladro Percutor 13mm 750W",
    description: "Taladro percutor 13mm, 750W, para hormigón, madera y metal.",
    price: 45990,
    stock: 28,
    categoria: "Herramientas y Maquinarias",
    categorySlug: "herramientas-maquinarias",
    aliases: ["taladradora", "drill percutor", "perforadora"],
    tags: ["taladro", "percutor", "13mm", "750w"],
  },
  {
    sku: "MULTIMETRO-DT9205A",
    title: "Multímetro Digital DT9205A",
    description: "Multímetro digital con medición de voltaje CA/CC y resistencia.",
    price: 12990,
    stock: 70,
    categoria: "Instrumentos de Medición",
    categorySlug: "instrumentos-medicion",
    aliases: ["tester digital", "multitester", "polimetro"],
    tags: ["multimetro", "tester", "digital", "voltaje"],
  },
  {
    sku: "TUBO-UV-120",
    title: "Tubo UV T8 120cm 36W",
    description: "Tubo UV T8 de 120cm, 36W, radiación ultravioleta para curado y efectos.",
    price: 11990,
    stock: 54,
    categoria: "Tubos y Lámparas Especiales",
    categorySlug: "tubos-lamparas-especiales",
    aliases: ["lampara uv", "luz ultravioleta", "luz negra"],
    tags: ["tubo", "uv", "36w", "ultravioleta"],
  },
  {
    sku: "PANEL-LED-60X60",
    title: "Panel LED Plafón 60x60cm 40W",
    description: "Panel LED para cielos empotrados 60x60cm, 40W, luz neutra.",
    price: 18990,
    stock: 60,
    categoria: "Iluminación LED y Neón",
    categorySlug: "iluminacion-led-neon",
    aliases: ["panel plafon", "luminaria empotrable", "panel cielo"],
    tags: ["panel", "plafon", "40w", "empotrado"],
  },
  {
    sku: "AMOLADORA-115",
    title: "Amoladora Angular 115mm 850W",
    description: "Amoladora angular 115mm, 850W, para corte y desbaste de metal.",
    price: 38990,
    stock: 32,
    categoria: "Herramientas y Maquinarias",
    categorySlug: "herramientas-maquinarias",
    aliases: ["esmeril angular", "radial 115", "moladora"],
    tags: ["amoladora", "radial", "115mm", "850w"],
  },
  {
    sku: "PINZA-AMP-600A",
    title: "Pinza Amperimétrica 600A AC",
    description: "Pinza amperimétrica digital 600A CA, mide corriente sin cortar el cable.",
    price: 28990,
    stock: 20,
    categoria: "Instrumentos de Medición",
    categorySlug: "instrumentos-medicion",
    aliases: ["pinza de medicion", "tester de corriente", "amperimetro"],
    tags: ["pinza", "amperimetrica", "600a", "corriente"],
  },
  {
    sku: "LAMP-HQI-250",
    title: "Lámpara HQI 250W E40",
    description: "Lámpara HQI 250W base E40, luz blanca de alta eficiencia.",
    price: 18990,
    stock: 24,
    categoria: "Tubos y Lámparas Especiales",
    categorySlug: "tubos-lamparas-especiales",
    aliases: ["lampara metal halide", "hqi 250", "luz invernadero"],
    tags: ["hqi", "250w", "e40", "metal halide"],
  },
];
async function main() {
  // 1) Tienda (upsert, no destructivo)
  const store = await prisma.storeConnection.upsert({
    where: { id: "seed-store" },
    update: { name: "Demo Store", provider: "mock", domain: "demo.acs.local" },
    create: { id: "seed-store", name: "Demo Store", provider: "mock", domain: "demo.acs.local", config: {} },
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
    update: { systemPrompt: SALES_SYSTEM_PROMPT, storeId, isActive: true },
    create: {
      slug: "sales-assistant",
      name: "Sales Assistant",
      description: "Ayuda a vender, consulta stock y procesa compras",
      systemPrompt: SALES_SYSTEM_PROMPT,
      model: "qwen/qwen3-30b-a3b-instruct-2507",
      isActive: true,
      storeId,
    },
  });

  console.log("Seed done", { storeId, products: existing.length || fallbackProducts.length, agent: agent.slug });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
