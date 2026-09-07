/**
 * ACS Agent — EVE core
 * Orquesta `ai` SDK + tools + system prompt desde DB
 * Modelo estable demo: qwen/qwen3-30b-a3b-instruct-2507 ($0.05/1M) + fallback openrouter/free
 */
import { generateText, stepCountIs, streamText, tool } from "ai";
import { z } from "zod";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { prisma } from "@/lib/adapters/prisma";
import { SALES_SYSTEM_PROMPT } from "../prisma/sales-system-prompt";
import { STARSHOP_CREWS, type StarShopIntent } from "../prisma/starshop-prompts";
import processPurchase from "./tools/process-purchase";
import checkStock from "./tools/check-stock";
import searchProducts from "./tools/search-products";
import cancelOrder from "./tools/cancel-order";
import navigateTo from "./tools/navigate";
import calculatePricing from "./tools/calculate-pricing";
import checkout from "./tools/checkout";
import scrapeWebsite from "./tools/scrape-website";
import sendEmail from "./tools/send-email";
import orderTracking from "./tools/order-tracking";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Llamada directa a OpenRouter como respaldo: genera respuesta conversacional real
// (el generateText con tools a veces corta en tool calls sin texto final).
async function directChat(
  apiKey: string,
  modelId: string,
  system: string,
  user: string
): Promise<string> {
  try {
    const body = {
      model: modelId,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      max_tokens: 500,
    };
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://agentic-commerce-stack.vercel.app",
        "X-Title": "ACS Sales Agent",
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      console.warn("[ACS-AGENT] directChat HTTP", r.status, t.slice(0, 200));
      return "";
    }
    const j = await r.json();
    return (j?.choices?.[0]?.message?.content ?? "").trim();
  } catch (e) {
    console.warn("[ACS-AGENT] directChat error", e instanceof Error ? e.message : e);
    return "";
  }
}

// ─── Config del agente con fallback sin BD ───────────────────────────────
// Si la base de datos no está disponible, el agente sigue funcionando con una
// configuración por defecto (mismo prompt y modelo). La BD solo aporta
// dashboard para editar prompts y persistir logs de conversaciones.
const DEFAULT_AGENT = {
  id: "builtin-default",
  slug: "sales-assistant",
  model: "qwen/qwen3-30b-a3b",
  systemPrompt: SALES_SYSTEM_PROMPT,
};

async function getAgentConfig(slug: string) {
  try {
    const agent = await prisma.agent.findUnique({ where: { slug } });
    if (agent) return agent;
    console.warn(`[ACS-AGENT] Agente "${slug}" no existe en BD, usando config por defecto.`);
    return DEFAULT_AGENT;
  } catch (e) {
    console.warn(
      "[ACS-AGENT] BD no disponible, usando config por defecto (el agente sigue funcionando):",
      e instanceof Error ? e.message : e
    );
    return DEFAULT_AGENT;
  }
}

async function logRunSafe(data: {
  agentId: string;
  input: object;
  output: object;
  status: string;
}) {
  try {
    await prisma.agentRun.create({ data });
  } catch (e) {
    console.warn("[ACS-AGENT] No se pudo guardar el log del run (la BD no responde o falla):", e instanceof Error ? e.message : e);
  }
}

// ── Intent detection (Welcome → Route) ─────────────────────────────────────
// Heurística rápida (sin LLM) para el router. El LLM del Welcome refina después.
function detectIntentHeuristic(message: string): StarShopIntent {
  const t = message.toLowerCase();
  if (/(devol|devoluci|cambio.*producto|garant.*falla|no me sirve.*devolver)/.test(t)) return "return_request";
  if (/(carrito abandon|dejé.*carrito|deje.*carrito|carrito.*abandon|retomar compr|abandon.*cart|carrito.*no pude pagar|quedó.*carrito|quedo.*carrito)/.test(t)) return "abandoned_cart";
  if (/(dónde está|donde esta|seguimiento|estado.*pedido|track.*order|rastrear|wismo|dónde va.*pedido)/.test(t)) return "order_tracking";
  if (/(compara.*precio|precio.*competencia|cotiz.*otro|más barato|mejor precio|precio.*otro lado)/.test(t)) return "price_comparison";
  if (/(pagar|checkout|carrito.*pago|despacho.*pago|método de pago|confirmar.*pedido|finalizar.*compra|quiero comprar|procesar.*compra)/.test(t)) return "checkout_support";
  if (/(política|politica|envío|envio|garantía|garantia|horario|contacto|quiénes son|quienes son|tienda.*info|cómo compr|como compr)/.test(t)) return "general_inquiry";
  if (/(hablar con|ejecutivo|humano|asesor|ventas@|llamar.*vendedor|persona real)/.test(t)) return "escalate_human";
  return "product_search";
}

// Whitelist de tools por crew (cada crew solo ve sus tools)
const CREW_TOOL_MAP: Record<StarShopIntent, string[]> = {
  product_search: ["searchProducts", "checkStock", "calculatePricing", "navigateTo", "scrapeWebsite"],
  price_comparison: ["searchProducts", "scrapeWebsite", "calculatePricing"],
  checkout_support: ["checkStock", "calculatePricing", "checkout", "processPurchase", "navigateTo", "sendEmail"],
  general_inquiry: ["scrapeWebsite", "navigateTo"],
  abandoned_cart: ["sendEmail", "searchProducts", "calculatePricing"],
  return_request: ["scrapeWebsite", "sendEmail", "searchProducts", "orderTracking"],
  order_tracking: ["orderTracking", "sendEmail", "scrapeWebsite"],
  escalate_human: ["sendEmail"],
};

// Registry para UI y para `ai` SDK (todos los tools)
export const acsTools = {
  processPurchase,
  checkStock,
  searchProducts,
  cancelOrder,
  navigateTo,
  calculatePricing,
  checkout,
  scrapeWebsite,
  sendEmail,
  orderTracking,
};

const ALL_TOOL_DEFS: Record<string, { description: string; inputSchema: z.ZodTypeAny; execute: unknown }> = {
  processPurchase: { description: processPurchase.description, inputSchema: processPurchase.inputSchema as z.ZodTypeAny, execute: processPurchase.execute as never },
  checkStock: { description: checkStock.description, inputSchema: checkStock.inputSchema as z.ZodTypeAny, execute: checkStock.execute as never },
  searchProducts: { description: searchProducts.description, inputSchema: searchProducts.inputSchema as z.ZodTypeAny, execute: searchProducts.execute as never },
  cancelOrder: { description: cancelOrder.description, inputSchema: cancelOrder.inputSchema as z.ZodTypeAny, execute: cancelOrder.execute as never },
  navigateTo: { description: navigateTo.description, inputSchema: navigateTo.inputSchema as z.ZodTypeAny, execute: navigateTo.execute as never },
  calculatePricing: { description: calculatePricing.description, inputSchema: calculatePricing.inputSchema as z.ZodTypeAny, execute: calculatePricing.execute as never },
  checkout: { description: checkout.description, inputSchema: checkout.inputSchema as z.ZodTypeAny, execute: checkout.execute as never },
  scrapeWebsite: { description: scrapeWebsite.description, inputSchema: scrapeWebsite.inputSchema as z.ZodTypeAny, execute: scrapeWebsite.execute as never },
  sendEmail: { description: sendEmail.description, inputSchema: sendEmail.inputSchema as z.ZodTypeAny, execute: sendEmail.execute as never },
  orderTracking: { description: orderTracking.description, inputSchema: orderTracking.inputSchema as z.ZodTypeAny, execute: orderTracking.execute as never },
};

function toAISDKTools(filter?: string[]) {
  const keys = filter ?? Object.keys(ALL_TOOL_DEFS);
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const def = ALL_TOOL_DEFS[k];
    if (!def) continue;
    out[k] = tool({ description: def.description, inputSchema: def.inputSchema, execute: def.execute as never });
  }
  return out as never;
}

function getCrewConfig(intent: StarShopIntent) {
  const map: Record<StarShopIntent, { slug: string; prompt: string; model: string }> = {
    product_search: { slug: STARSHOP_CREWS.search_and_recommend.slug, prompt: STARSHOP_CREWS.search_and_recommend.prompt, model: STARSHOP_CREWS.search_and_recommend.model },
    price_comparison: { slug: STARSHOP_CREWS.compare_prices.slug, prompt: STARSHOP_CREWS.compare_prices.prompt, model: STARSHOP_CREWS.compare_prices.model },
    checkout_support: { slug: STARSHOP_CREWS.checkout_guide.slug, prompt: STARSHOP_CREWS.checkout_guide.prompt, model: STARSHOP_CREWS.checkout_guide.model },
    general_inquiry: { slug: STARSHOP_CREWS.general_support.slug, prompt: STARSHOP_CREWS.general_support.prompt, model: STARSHOP_CREWS.general_support.model },
    abandoned_cart: { slug: STARSHOP_CREWS.recover_cart.slug, prompt: STARSHOP_CREWS.recover_cart.prompt, model: STARSHOP_CREWS.recover_cart.model },
    return_request: { slug: STARSHOP_CREWS.handle_return.slug, prompt: STARSHOP_CREWS.handle_return.prompt, model: STARSHOP_CREWS.handle_return.model },
    order_tracking: { slug: STARSHOP_CREWS.order_tracking.slug, prompt: STARSHOP_CREWS.order_tracking.prompt, model: STARSHOP_CREWS.order_tracking.model },
    escalate_human: { slug: STARSHOP_CREWS.escalate_human.slug, prompt: STARSHOP_CREWS.escalate_human.prompt, model: STARSHOP_CREWS.escalate_human.model },
  };
  return map[intent];
}

function formatHistory(history: unknown): string {
  if (!Array.isArray(history) || history.length === 0) return "";
  const lines = (history as Array<{ role?: string; text?: string; content?: string }>)
    .slice(-8)
    .map((m) => {
      const role = m.role === "user" ? "Cliente" : "Star";
      const txt = (m.text ?? m.content ?? "").toString().slice(0, 400);
      return `${role}: ${txt}`;
    })
    .join("\n");
  return `\n\nHistorial reciente:\n${lines}\n\nResponde considerando el historial. Si el cliente dice "cuánto con despacho" recuerda el producto anterior.`;
}

export type RunAgentResult = Awaited<ReturnType<typeof runAgent>>;

/** Flujo 1→2→6+3→4 — detecta intent y despacha al crew correcto */
export async function runStarShopFlow(params: { input: string; storeId?: string; history?: unknown[] }) {
  const heuristic = detectIntentHeuristic(params.input);
  // Intenta refinar con LLM Welcome si hay key, pero no bloquea si falla
  const detectedIntent: StarShopIntent = heuristic;
  // Heurística ya es robusta; el refinement LLM se hace implícito en el crew prompt.
  // Si algún día quieres LLM intent, descomenta generateText con STARSHOP_WELCOME_PROMPT.

  const crew = getCrewConfig(detectedIntent);
  const allowedTools = CREW_TOOL_MAP[detectedIntent] ?? Object.keys(ALL_TOOL_DEFS);

  // Ejecuta el workflow router en background para observabilidad (no bloquea respuesta)
  void (async () => {
    try {
      const { starShopRouterWorkflow } = await import("@/workflows/starshop-router");
      const { startWorkflow } = await import("@/lib/workflows/engine");
      await startWorkflow(starShopRouterWorkflow, { message: params.input, detectedIntent, orderId: undefined });
    } catch (e) {
      console.warn("[ACS-ROUTER] workflow log failed", e instanceof Error ? e.message : e);
    }
  })();

  // Delega al runAgent del crew con historial
  const promptWithHistory = params.input + formatHistory(params.history);
  const inner = await runAgent({
    agentSlug: crew.slug,
    input: promptWithHistory,
    storeId: params.storeId,
    history: params.history,
    _override: { systemPrompt: crew.prompt, model: crew.model, allowedTools },
  } as never);

  return { ...inner, detectedIntent, crew: crew.slug, allowedTools };
}

export async function runAgent(params: { agentSlug: string; input: string; storeId?: string; history?: unknown[]; _override?: { systemPrompt: string; model: string; allowedTools: string[] } }) {
  // _override: usado por runStarShopFlow para inyectar prompt/whitelist del crew sin tocar DB
  let agent: { id: string; slug: string; model: string | null; systemPrompt: string | null };
  let system: string;
  let modelId: string;
  let allowedTools: string[] | undefined;

  if (params._override) {
    agent = { id: `crew-${params.agentSlug}`, slug: params.agentSlug, model: params._override.model, systemPrompt: params._override.systemPrompt };
    system = params._override.systemPrompt;
    modelId = params._override.model;
    allowedTools = params._override.allowedTools;
  } else {
    agent = await getAgentConfig(params.agentSlug) as never;
    system = agent.systemPrompt ?? `Eres asistente de commerce para ${params.storeId ?? "tienda demo"}. Ayuda a buscar productos, verificar stock y comprar.`;
    modelId = agent.model ?? "qwen/qwen3-30b-a3b";
  }

  const model = openrouter.chat(modelId as never) as never;

  const promptWithHistory = params.history ? params.input + formatHistory(params.history) : params.input;

  const result = await generateText({
    model,
    system,
    prompt: promptWithHistory,
    tools: toAISDKTools(allowedTools),
    stopWhen: stepCountIs(4) as never,
  });

  // Agrega los tool calls de TODOS los pasos (result.toolCalls solo refleja el último)
  const stepToolCalls = ((result as unknown as { steps?: Array<{ toolCalls?: unknown[] }> }).steps ?? [])
    .flatMap((s) => s.toolCalls ?? []);

  // Si el LLM cortó sin texto (solo tool calls o respuesta vacía), genera respuesta
  // conversacional real vía llamada directa a OpenRouter.
  let finalText = (result.text ?? "").trim();
  let direct = false;
  if (!finalText && stepToolCalls.length > 0) {
    const apiKey = process.env.OPENROUTER_API_KEY ?? "";
    if (apiKey) {
      const directReply = await directChat(apiKey, modelId, system, params.input);
      if (directReply) {
        finalText = directReply;
        direct = true;
      }
    }
  }

  // Log run (no bloquea la respuesta si la BD falla)
  await logRunSafe({
    agentId: agent.id,
    input: { text: params.input, storeId: params.storeId, crew: params.agentSlug } as object,
    output: { text: finalText || result.text, toolCalls: stepToolCalls } as object,
    status: "COMPLETED",
  });

  return { ...result, text: finalText, rawText: result.text, directFallback: direct, toolCalls: stepToolCalls, agentSlug: agent.slug };
}

// ── Streaming: mismo router pero con streamText para efecto tipeo IA ──
export async function* streamAgent(params: { agentSlug: string; input: string; storeId?: string; history?: unknown[]; _override?: { systemPrompt: string; model: string; allowedTools: string[] } }) {
  let agent: { id: string; slug: string; model: string | null; systemPrompt: string | null };
  let system: string;
  let modelId: string;
  let allowedTools: string[] | undefined;

  if (params._override) {
    agent = { id: `crew-${params.agentSlug}`, slug: params.agentSlug, model: params._override.model, systemPrompt: params._override.systemPrompt };
    system = params._override.systemPrompt;
    modelId = params._override.model;
    allowedTools = params._override.allowedTools;
  } else {
    agent = (await getAgentConfig(params.agentSlug)) as never;
    system = agent.systemPrompt ?? `Eres asistente de commerce para ${params.storeId ?? "tienda demo"}. Ayuda a buscar productos, verificar stock y comprar.`;
    modelId = agent.model ?? "qwen/qwen3-30b-a3b";
  }

  const model = openrouter.chat(modelId as never) as never;

  const promptWithHistory = params.history ? params.input + formatHistory(params.history) : params.input;

  const result = streamText({
    model,
    system,
    prompt: promptWithHistory,
    tools: toAISDKTools(allowedTools) as never,
    stopWhen: stepCountIs(4) as never,
  });

  // Stream text chunks como IA que escribe
  for await (const chunk of result.textStream) {
    yield { type: "text" as const, text: chunk };
  }

  // Al final, emite toolCalls + meta (para que el frontend sepa navegar)
  const toolCalls = ((await result.toolCalls) ?? []) as unknown as Array<Record<string, unknown>>;
  const finalText = await result.text;
  yield { type: "done" as const, text: finalText, toolCalls, agentSlug: agent.slug };
}

export async function* streamStarShopFlow(params: { input: string; storeId?: string; history?: unknown[] }) {
  const heuristic = detectIntentHeuristic(params.input);
  const detectedIntent = heuristic;
  const crew = getCrewConfig(detectedIntent);
  const allowedTools = CREW_TOOL_MAP[detectedIntent] ?? Object.keys(ALL_TOOL_DEFS);

  void (async () => {
    try {
      const { starShopRouterWorkflow } = await import("@/workflows/starshop-router");
      const { startWorkflow } = await import("@/lib/workflows/engine");
      await startWorkflow(starShopRouterWorkflow, { message: params.input, detectedIntent, orderId: undefined });
    } catch (e) {
      console.warn("[ACS-ROUTER-STREAM] workflow log failed", e instanceof Error ? e.message : e);
    }
  })();

  yield { type: "meta" as const, detectedIntent, crew: crew.slug };

  for await (const chunk of streamAgent({
    agentSlug: crew.slug,
    input: params.input,
    storeId: params.storeId,
    history: params.history,
    _override: { systemPrompt: crew.prompt, model: crew.model, allowedTools },
  } as never)) {
    yield chunk;
  }
}

export default { runAgent, streamAgent, runStarShopFlow, streamStarShopFlow, tools: acsTools };
