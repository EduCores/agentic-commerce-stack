/**
 * ACS — Seed DEMO: datos ficticios coherentes sobre el catálogo real de seed-store.
 *
 * Genera para mostrar el sistema "vivo" a clientes:
 *   - Clientes demo (metadata.demo = true, distribuidos en 6 semanas)
 *   - Pedidos con ítems del catálogo (30 días, sesgo a días recientes para los gráficos)
 *   - WorkflowRuns + OrderStepLogs (proceso de compra RESERVE_STOCK → PAYMENT → FULFILL)
 *   - AgentRuns (conversaciones EVE de los últimos 14 días)
 *
 * Todo queda marcado como demo → se elimina con: npm run acs:clean-demo
 * Idempotente: si ya hay pedidos demo no duplica (usa --force para re-sembrar).
 * Requisito: correr antes `npm run acs:seed` (agentes, crews y workflows).
 */
import "dotenv/config";
import { prisma } from "../src/lib/adapters/prisma";
import { fallbackProducts } from "./catalog";

const FORCE = process.argv.includes("--force");
const N_CUSTOMERS = 34;
const N_ORDERS = 120;
const N_AGENT_RUNS = 160;

// ── PRNG determinista: la misma demo en cada corrida ─────────────────────────
function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260921);
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
/** Día hacia atrás con sesgo a lo reciente (0 = hoy). */
const recentDay = (span: number, bias = 1.7) => Math.floor(Math.pow(rand(), bias) * span);

function pastDate(dayOffset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - dayOffset);
  d.setHours(int(9, 20), int(0, 59), int(0, 59), 0);
  if (d.getTime() > Date.now()) d.setTime(Date.now() - int(5, 120) * 60_000);
  return d;
}
const plusMinutes = (d: Date, min: number) => new Date(d.getTime() + min * 60_000);
const minutesAgo = (min: number) => new Date(Date.now() - min * 60_000);

// ── Datos base ────────────────────────────────────────────────────────────────
const CUSTOMERS: Array<[string, string]> = [
  ["Constructora Andes", "contacto@constructoraandes.cl"],
  ["Ferretería Sur", "ventas@ferreteriasur.cl"],
  ["Electricidad Providencia", "compras@electroprovidencia.cl"],
  ["Constructora Los Álamos", "obras@losalamos.cl"],
  ["Ferretería El Tornero", "pedidos@eltornero.cl"],
  ["Iluminación Centro SpA", "contacto@ilumcentro.cl"],
  ["Electro Antofagasta", "ventas@electroantofa.cl"],
  ["Constructora Río Claro", "compras@crioclaro.cl"],
  ["Ferretería Maipú", "ventas@ferremaipu.cl"],
  ["Minera Cordillera SpA", "abastecimiento@mineracordillera.cl"],
  ["Instalaciones Bravo", "proyectos@instbravo.cl"],
  ["Ferretería La Unión", "contacto@ferrelaunion.cl"],
  ["Constructora Vertiente", "proyectos@vertiente.cl"],
  ["Electro Dominga", "ventas@electrodominga.cl"],
  ["Ferretería Quilicura", "pedidos@ferrequilicura.cl"],
  ["Chileluz Ltda", "contacto@chileluz.cl"],
  ["Constructora San Vicente", "compras@sanvicente.cl"],
  ["Ferretería Puerto Montt", "ventas@ferepm.cl"],
  ["Coronel Eléctrico SpA", "ventas@coronelelectrico.cl"],
  ["Constructora Aconcagua", "obras@aconcagua.cl"],
  ["Juan Pérez", "juan.perez@gmail.com"],
  ["María González", "maria.gonzalez@yahoo.cl"],
  ["Carlos Rojas", "carlos.rojas@hotmail.com"],
  ["Ana Silva", "ana.silva@gmail.com"],
  ["Pedro Fuentes", "pfuentes@gmail.com"],
  ["Luisa Herrera", "luisa.herrera@outlook.cl"],
  ["Jorge Muñoz", "jorge.munoz@gmail.com"],
  ["Carmen Torres", "carmen.torres@gmail.com"],
  ["Miguel Castillo", "miguel.castillo@hotmail.com"],
  ["Paula Vargas", "paula.vargas@gmail.com"],
  ["Rodrigo Soto", "rodrigo.soto@gmail.com"],
  ["Claudia Ramírez", "claudia.ramirez@gmail.com"],
  ["Fernando Vega", "fernando.vega@gmail.com"],
  ["Daniela Espinoza", "daniela.espinoza@gmail.com"],
];

const DEMO_MESSAGES = [
  "¿Tienen stock del Proyector LED 200W IP66?",
  "¿Cuánto sale el envío del taladro a Concepción?",
  "Quiero 5 paneles LED 60x60 para una oficina",
  "¿El multímetro DT9205A mide corriente continua?",
  "Necesito tubos UV 120cm, ¿tienen disponibilidad?",
  "¿Qué amoladora recomiendas para cortar metal?",
  "¿Dónde va mi pedido?",
  "Quiero devolver una pinza amperimétrica",
  "¿Puedo pagar por transferencia?",
  "¿Tienen lámparas HQI 250W base E40?",
  "Dejé el carrito sin pagar, ¿lo retomamos?",
  "¿Hacen despacho a regiones?",
];

const DEMO_REPLIES = [
  "¡Hola! Sí, tenemos stock disponible. ¿Te muestro las opciones de despacho?",
  "El despacho a región cuesta $7.990 y llega en 2-3 días hábiles. ¿Confirmo el pedido?",
  "Listo, te armé el carrito con los productos. ¿Finalizamos la compra?",
  "Sí, ese modelo mide tensión CA y CC. ¿Te paso las especificaciones completas?",
  "Tu pedido fue despachado y llega mañana entre 9:00 y 18:00 hrs.",
  "Perfecto, agendé el retiro del producto. ¿Puedes contarme el detalle de la falla?",
];

type DemoStatus = { status: string; payment: string; fulfillment: string };
function rollStatus(): DemoStatus {
  const r = rand();
  if (r < 0.45) return { status: "PAID", payment: "PAID", fulfillment: "UNFULFILLED" };
  if (r < 0.75) return { status: "FULFILLED", payment: "PAID", fulfillment: "FULFILLED" };
  if (r < 0.87) return { status: "PENDING", payment: "PENDING", fulfillment: "UNFULFILLED" };
  if (r < 0.93) return { status: "CANCELLED", payment: "PENDING", fulfillment: "CANCELLED" };
  if (r < 0.97) return { status: "REFUNDED", payment: "REFUNDED", fulfillment: "UNFULFILLED" };
  return { status: "FAILED", payment: "FAILED", fulfillment: "UNFULFILLED" };
}

async function main() {
  // 0) Guard idempotente: no duplicar demo
  const existingDemo = await prisma.order.count({ where: { metadata: { path: ["demo"], equals: true } } });
  if (existingDemo > 0 && !FORCE) {
    console.log(`[seed-demo] ya existen ${existingDemo} pedidos demo. Usa --force para re-sembrar.`);
    return;
  }

  // 1) Tienda + catálogo (idéntico a seed.ts, no destructivo)
  const store = await prisma.storeConnection.upsert({
    where: { id: "seed-store" },
    update: {},
    create: { id: "seed-store", name: "Starshop Frontend", provider: "starshop", domain: process.env.STARSHOP_API_URL ?? "http://localhost:3000", config: {} },
  });
  const storeId = store.id;
  let products = await prisma.product.findMany({ where: { storeId } });
  if (products.length === 0) {
    await prisma.product.createMany({
      data: fallbackProducts.map((p) => ({
        storeId, sku: p.sku, title: p.title, description: p.description, price: p.price, currency: "CLP", stock: p.stock,
        metadata: { categoria: p.categoria, categorySlug: p.categorySlug, aliases: p.aliases, tags: p.tags },
      })),
      skipDuplicates: true,
    });
    products = await prisma.product.findMany({ where: { storeId } });
    console.log(`[seed-demo] catálogo creado (${products.length} SKUs).`);
  }
  console.log(`[seed-demo] catálogo: ${products.length} producto(s).`);

  // 2) Agentes y workflows (provistos por acs:seed)
  const agents = await prisma.agent.findMany({ where: { isActive: true }, select: { id: true, slug: true } });
  if (agents.length === 0) throw new Error("No hay agentes en la BD. Corre primero: npm run acs:seed");
  const wfProc = await prisma.workflowDefinition.findUnique({ where: { slug: "process-order" } });
  const wfRouter = await prisma.workflowDefinition.findUnique({ where: { slug: "starshop-intent-router" } });
  if (!wfProc || !wfRouter) throw new Error("Faltan workflows (process-order / starshop-intent-router). Corre: npm run acs:seed");

  // 3) Clientes demo (distribuidos en 6 semanas para el gráfico de crecimiento CRM)
  for (const [name, email] of CUSTOMERS) {
    await prisma.customer.create({
      data: { name, email, phone: `569${int(10000000, 99999999)}`, metadata: { demo: true }, createdAt: pastDate(int(0, 42)) },
    });
  }
  const customers = await prisma.customer.findMany({ where: { metadata: { path: ["demo"], equals: true } }, select: { id: true } });
  console.log(`[seed-demo] clientes: ${customers.length}.`);

  // 4) Pedidos con ítems coherentes con el catálogo (30 días, sesgo reciente)
  const sources = ["starshop", "starshop", "starshop", "whatsapp", "shopify", "shopify", "manual", "eve"];
  let orderCount = 0;
  const pendingOrderIds: string[] = [];
  const paidOrders: Array<{ id: string; createdAt: Date; source: string }> = [];
  for (let i = 0; i < N_ORDERS; i++) {
    const createdAt = pastDate(recentDay(30));
    const st = rollStatus();
    const customer = pick(customers);
    const chosen = new Set<string>();
    const items: Array<{ productId: string; quantity: number; price: number; total: number }> = [];
    let subtotal = 0;
    for (let j = 0; j < int(1, 4); j++) {
      const p = pick(products);
      if (chosen.has(p.id)) continue;
      chosen.add(p.id);
      const qty = rand() < 0.75 ? int(1, 3) : int(4, 8);
      const price = Number(p.price);
      subtotal += price * qty;
      items.push({ productId: p.id, quantity: qty, price, total: price * qty });
    }
    if (items.length === 0) continue;
    const shipping = subtotal >= 100000 ? 0 : 7990;
    const source = pick(sources);
    const order = await prisma.order.create({
      data: {
        storeId, customerId: customer.id, source,
        status: st.status as never, paymentStatus: st.payment as never, fulfillmentStatus: st.fulfillment as never,
        currency: "CLP", subtotal, tax: 0, shipping, total: subtotal + shipping,
        metadata: { demo: true }, createdAt, updatedAt: createdAt,
        items: { create: items },
      },
    });
    orderCount++;
    if (st.status === "PENDING" && pendingOrderIds.length < 3) pendingOrderIds.push(order.id);
    if (st.status === "PAID" || st.status === "FULFILLED") paidOrders.push({ id: order.id, createdAt, source });
  }
  console.log(`[seed-demo] pedidos: ${orderCount}.`);

  // 5) WorkflowRuns + step logs (RESERVE_STOCK → PROCESS_PAYMENT → FULFILL)
  const WF_STEPS: Array<[string, string]> = [["RESERVE_STOCK", "reserve-1"], ["PROCESS_PAYMENT", "payment-1"], ["FULFILL", "fulfill-1"]];
  let wfRuns = 0;
  for (const o of paidOrders) {
    const wf = o.source === "eve" && wfRouter ? wfRouter : wfProc;
    const started = plusMinutes(o.createdAt, int(2, 20));
    const completed = plusMinutes(started, int(4, 9));
    const run = await prisma.workflowRun.create({
      data: {
        workflowId: wf.id, orderId: o.id, status: "COMPLETED",
        input: { orderId: o.id, source: o.source }, output: { ok: true, steps: WF_STEPS.length },
        currentStep: "FULFILL", startedAt: started, completedAt: completed, createdAt: o.createdAt, updatedAt: completed,
      },
    });
    await prisma.order.update({ where: { id: o.id }, data: { workflowRunId: run.id } });
    for (let s = 0; s < WF_STEPS.length; s++) {
      const [stepName, nodeId] = WF_STEPS[s];
      const sStart = plusMinutes(started, s * 2);
      await prisma.orderStepLog.create({
        data: { orderId: o.id, workflowRunId: run.id, stepName, nodeId, status: "COMPLETED", startedAt: sStart, completedAt: plusMinutes(sStart, 2), createdAt: sStart },
      });
    }
    wfRuns++;
  }
  // Algunos runs RUNNING recientes → CRM tasks y actividad en el XYFlow
  for (const id of pendingOrderIds) {
    const started = minutesAgo(int(10, 40));
    const run = await prisma.workflowRun.create({
      data: { workflowId: wfProc.id, orderId: id, status: "RUNNING", input: { orderId: id }, currentStep: "PROCESS_PAYMENT", startedAt: started, createdAt: started },
    });
    await prisma.order.update({ where: { id }, data: { workflowRunId: run.id } });
    await prisma.orderStepLog.create({ data: { orderId: id, workflowRunId: run.id, stepName: "RESERVE_STOCK", nodeId: "reserve-1", status: "COMPLETED", startedAt: started, completedAt: plusMinutes(started, 2), createdAt: started } });
    await prisma.orderStepLog.create({ data: { orderId: id, workflowRunId: run.id, stepName: "PROCESS_PAYMENT", nodeId: "payment-1", status: "RUNNING", startedAt: plusMinutes(started, 2), createdAt: plusMinutes(started, 2) } });
    wfRuns++;
  }
  console.log(`[seed-demo] workflowRuns: ${wfRuns}.`);

  // 6) AgentRuns (conversaciones EVE de los últimos 14 días)
  for (let i = 0; i < N_AGENT_RUNS; i++) {
    const agent = pick(agents);
    const failed = rand() < 0.05;
    await prisma.agentRun.create({
      data: {
        agentId: agent.id, status: failed ? "FAILED" : "COMPLETED",
        input: { message: pick(DEMO_MESSAGES), demo: true },
        output: failed ? { error: "timeout esperando tool" } : { text: pick(DEMO_REPLIES) },
        createdAt: pastDate(recentDay(14, 1.4)),
      },
    });
  }

  const [pc, oc, cc, arc] = await Promise.all([
    prisma.product.count({ where: { storeId } }),
    prisma.order.count(),
    prisma.customer.count(),
    prisma.agentRun.count(),
  ]);
  console.log("[seed-demo] ✅ listo:", { products: pc, orders: oc, customers: cc, agentRuns: arc, workflowRunsCreados: wfRuns });
  console.log("[seed-demo] Para revertir: npm run acs:clean-demo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
