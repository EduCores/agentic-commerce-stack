/**
 * ACS Agent — EVE core
 * Orquesta `ai` SDK + tools + system prompt desde DB
 * Modelo estable demo: qwen/qwen3-30b ($0.05/1M) + fallback openrouter/free
 */
import { generateText, stepCountIs, streamText, tool } from "ai";
import { z } from "zod";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { prisma } from "@/lib/adapters/prisma";
import { SALES_SYSTEM_PROMPT } from "../prisma/sales-system-prompt";
import { STARSHOP_CREWS, STARSHOP_CREW_TOOLS, STARSHOP_LANGUAGE_RULE, type StarShopIntent } from "../prisma/starshop-prompts";
import { getGraphCrewOverrides, clearCrewGraphCache as clearGraphCache, type GraphCrewOverride } from "./lib/crew-graph";
import { detectIntent } from "@/lib/eve/detect-intent";
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

// Cliente separado para admin (créditos/límite independientes de tienda).
// Si no hay OPENROUTER_ADMIN_KEY, cae a la key general.
function getOpenRouter(isAdmin?: boolean) {
  if (isAdmin && process.env.OPENROUTER_ADMIN_KEY) {
    return createOpenRouter({ apiKey: process.env.OPENROUTER_ADMIN_KEY });
  }
  return openrouter;
}

// Llamada directa a OpenRouter como respaldo: genera respuesta conversacional real
// (el generateText con tools a veces corta en tool calls sin texto final).
// Recibe los mensajes ya construidos (historial + input) para NO perder el contexto.
async function directChat(
  apiKey: string,
  modelId: string,
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  try {
    const body = {
      model: modelId,
      messages: [
        { role: "system", content: system },
        ...messages,
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
      console.log("[ACS-AGENT] directChat HTTP", r.status, t.slice(0, 200));
      return "";
    }
    const j = await r.json();
    return (j?.choices?.[0]?.message?.content ?? "").trim();
  } catch (e) {
    console.log("[ACS-AGENT] directChat error", e instanceof Error ? e.message : e);
    return "";
  }
}

/**
 * Construye los mensajes de conversación con roles reales para el SDK `ai`.
 * El historial se envía como turnos previos <user>/<assistant> y el input actual
 * como último mensaje. Esto evita que el modelo confunda quién dijo qué
 * (el formato anterior inyectaba "Cliente:/Star:" como texto plano dentro del
 * mensaje de usuario, lo que producía respuestas erráticas con historial activo).
 */
type ChatTurn = { role?: string; text?: string; content?: string };

function toModelMessages(input: string, history?: unknown[]): Array<{ role: "user" | "assistant"; content: string }> {
  const out: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (Array.isArray(history)) {
    for (const m of history.slice(-6) as ChatTurn[]) {
      if (!m || typeof m !== "object") continue;
      const text = ((m.text ?? m.content) ?? "").toString().trim();
      if (!text) continue;
      out.push({ role: m.role === "user" ? "user" : "assistant", content: text.slice(0, 600) });
    }
  }
  const current = input.trim();
  if (current) out.push({ role: "user", content: current });
  return out;
}

// ─── Config del agente con fallback sin BD ───────────────────────────────
// Si la base de datos no está disponible, el agente sigue funcionando con una
// configuración por defecto (mismo prompt y modelo). La BD solo aporta
// dashboard para editar prompts y persistir logs de conversaciones.
const DEFAULT_MODEL = "qwen/qwen3-30b";

const DEFAULT_AGENT = {
  id: "builtin-default",
  slug: "sales-assistant",
  model: DEFAULT_MODEL,
  systemPrompt: SALES_SYSTEM_PROMPT,
};

async function getAgentConfig(slug: string) {
  try {
    const agent = await prisma.agent.findUnique({ where: { slug } });
    if (agent) return agent;
    console.log(`[ACS-AGENT] Agente "${slug}" no existe en BD, usando config por defecto.`);
    return DEFAULT_AGENT;
  } catch (e) {
    console.log(
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
    console.log("[ACS-AGENT] No se pudo guardar el log del run (la BD no responde o falla):", e instanceof Error ? e.message : e);
  }
}

// Intent detection vive en @/lib/eve/detect-intent (LLM con fallback heurístico mock).
// Whitelist de tools por crew (cada crew solo ve sus tools)
// Whitelist de tools por intent (definida en prisma/starshop-prompts.ts: misma fuente
// que usa el grafo publicado, para que código y grafo no puedan divergir).
const CREW_TOOL_MAP = STARSHOP_CREW_TOOLS;

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

// Tools compilados UNA vez al cargar el módulo (evita reconstruir wrappers en cada request)
const ALL_AI_TOOLS: Record<string, unknown> = Object.fromEntries(
  Object.entries(ALL_TOOL_DEFS).map(([k, def]) => [
    k,
    tool({ description: def.description, inputSchema: def.inputSchema, execute: def.execute as never }),
  ])
);

function toAISDKTools(filter?: string[]) {
  if (!filter) return ALL_AI_TOOLS as never;
  const out: Record<string, unknown> = {};
  for (const k of filter) {
    const t = ALL_AI_TOOLS[k];
    if (t) out[k] = t;
  }
  return out as never;
}

// Mapa de crews por intención — estático, se construye UNA vez al cargar el módulo
// Mapeo StarShopIntent (detectIntent) -> key de STARSHOP_CREWS (prisma/starshop-prompts.ts).
// OJO: los nombres NO coinciden 1:1 (ej. checkout_support usa el crew checkout_guide).
const intentToCrewKey: Record<StarShopIntent, keyof typeof STARSHOP_CREWS> = {
  product_search: "search_and_recommend",
  price_comparison: "compare_prices",
  checkout_support: "checkout_guide",
  general_inquiry: "general_support",
  abandoned_cart: "recover_cart",
  return_request: "handle_return",
  order_tracking: "order_tracking",
  escalate_human: "escalate_human",
  admin_ops: "admin_ops",
};

// Tools realmente registradas/instanciadas (para validar overrides del grafo)
const KNOWN_TOOLS = Object.keys(ALL_TOOL_DEFS) as string[];

// Allowlist de modelos: un typo en el editor jamas rompe el chat (se ignora el override)
const ALLOWED_MODELS = [
  "qwen/qwen3-30b",
  "openai/gpt-4o",
  "google/gemini-2-0-flash-001",
] as const;

// Cache local de overrides del grafo (60s) compartido por getCrewConfig y el endpoint de chat
const OVERRIDES_TTL_MS = 60_000;
let crewOverridesCache: Partial<Record<StarShopIntent, GraphCrewOverride>> | null = null;
let crewOverridesAt = 0;

/**
 * Carga (o reutiliza si el cache sigue fresco) los overrides del grafo publicado.
 * Nunca lanza: si la BD o el grafo fallan, getGraphCrewOverrides devuelve null.
 */
export async function refreshCrewOverrides() {
  if (crewOverridesCache && Date.now() - crewOverridesAt < OVERRIDES_TTL_MS) return crewOverridesCache;
  crewOverridesCache = await getGraphCrewOverrides(KNOWN_TOOLS, [...ALLOWED_MODELS]);
  crewOverridesAt = Date.now();
  return crewOverridesCache;
}

/** Ultimo mapa de overrides cargado (null = usa config del codigo). */
export function getCachedCrewOverrides() {
  return crewOverridesCache;
}

/** Invalida el cache local y el de crew-graph (tras guardar/publicar un grafo). */
export function clearCrewGraphCache() {
  clearGraphCache();
  crewOverridesCache = null;
  crewOverridesAt = 0;
}

/**
 * Config del crew (slug/prompt/modelo/tools) para un intent.
 * Prioridad: override validado del grafo publicado > config del codigo (fallback).
 * Cada request tiene SIEMPRE una config completa: el agente nunca corre sin prompt/modelo.
 */
export async function getCrewConfig(intent: StarShopIntent): Promise<{ slug: string; prompt: string; model: string; tools: string[] }> {
  const base = STARSHOP_CREWS[intentToCrewKey[intent]];
  const baseTools = CREW_TOOL_MAP[intent] ?? Object.keys(ALL_TOOL_DEFS);

  const overrides = await refreshCrewOverrides();
  const ov = overrides?.[intent];

  // Sin grafo publicado (o grafo invalido) para este intent -> config del codigo
  if (!ov) return { slug: base.slug, prompt: base.prompt, model: base.model, tools: baseTools };

  // Solo campos ya validados por crew-graph (prompt > 40 chars, modelo en allowlist, tools del registry)
  return {
    slug: base.slug,
    prompt: ov.prompt ?? base.prompt,
    model: ov.model ?? base.model,
    tools: ov.tools ?? baseTools,
  };
}

/**
 * Fire-and-forget: registra el router en workflows para observabilidad.
 * Import dinámico para no cargar el engine en el cold path del LLM.
 */
function logRouterWorkflow(message: string, detectedIntent: StarShopIntent, tag: string) {
  void (async () => {
    try {
      const { starShopRouterWorkflow } = await import("@/workflows/starshop-router");
      const { startWorkflow } = await import("@/lib/workflows/engine");
      await startWorkflow(starShopRouterWorkflow, { message, detectedIntent, orderId: undefined });
    } catch (e) {
      console.log(`[${tag}] workflow log failed`, e instanceof Error ? e.message : e);
    }
  })();
}

type ResolvedAgentConfig = {
  agent: { id: string; slug: string; model: string | null; systemPrompt: string | null };
  system: string;
  modelId: string;
  allowedTools: string[] | undefined;
};

/**
 * Resuelve prompt/modelo/whitelist del agente UNA vez por request (antes estaba
 * duplicado en runAgent y streamAgent). `_override` inyecta crew sin tocar DB.
 */
async function resolveAgent(params: { agentSlug: string; storeId?: string; _override?: { systemPrompt: string; model: string; allowedTools: string[] } }): Promise<ResolvedAgentConfig> {
  if (params._override) {
    return {
      agent: { id: `crew-${params.agentSlug}`, slug: params.agentSlug, model: params._override.model, systemPrompt: params._override.systemPrompt },
      system: `${params._override.systemPrompt}\n\n${STARSHOP_LANGUAGE_RULE}`,
      modelId: params._override.model,
      allowedTools: params._override.allowedTools,
    };
  }
  const agent = (await getAgentConfig(params.agentSlug)) as ResolvedAgentConfig["agent"];
  return {
    agent,
    system: `${agent.systemPrompt ?? `Eres asistente de commerce para ${params.storeId ?? "tienda demo"}. Ayuda a buscar productos, verificar stock y comprar.`}\n\n${STARSHOP_LANGUAGE_RULE}`,
    modelId: agent.model ?? DEFAULT_MODEL,
    allowedTools: undefined,
  };
}

export type RunAgentResult = Awaited<ReturnType<typeof runAgent>>;

/**
 * Admin Ops dedicado — NO usa heurística, siempre crew admin_ops.
 * Endpoint separado /api/admin/chat: sin flag que olvidar, sin tildes que fallar,
 * sin fuga a tienda, con key propia (OPENROUTER_ADMIN_KEY).
 */
export async function runAdminOps(params: { input: string; storeId?: string; history?: unknown[] }) {
  const detectedIntent: StarShopIntent = "admin_ops";
  const crew = await getCrewConfig(detectedIntent);
  const allowedTools = CREW_TOOL_MAP[detectedIntent] ?? Object.keys(ALL_TOOL_DEFS);

  logRouterWorkflow(params.input, detectedIntent, "ACS-ADMIN");

  const inner = await runAgent({
    agentSlug: crew.slug,
    input: params.input,
    storeId: params.storeId,
    history: params.history,
    useAdminKey: true,
    _override: { systemPrompt: crew.prompt, model: crew.model, allowedTools },
  } as never);

  return { ...inner, detectedIntent, crew: crew.slug, allowedTools };
}

export async function runAgent(params: { agentSlug: string; input: string; storeId?: string; history?: unknown[]; useAdminKey?: boolean; _override?: { systemPrompt: string; model: string; allowedTools: string[] } }) {
  // _override: usado por runStarShopFlow para inyectar prompt/whitelist del crew sin tocar DB
  // useAdminKey: usa OPENROUTER_ADMIN_KEY (créditos separados de tienda)
  const { agent, system, modelId, allowedTools } = await resolveAgent(params);

  const model = getOpenRouter(params.useAdminKey).chat(modelId as never) as never;

  // El historial se envía como mensajes previos con roles (user/assistant) para
  // que el modelo sepa exactamente quién dijo qué. El input actual siempre va al final.
  const messages = toModelMessages(params.input, params.history);

  let result: Awaited<ReturnType<typeof generateText>>;
  try {
    result = await generateText({
      model,
      system,
      messages,
      tools: toAISDKTools(allowedTools),
      stopWhen: stepCountIs(4) as never,
      maxOutputTokens: 700,
    } as never);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Fallback amigable si es límite de créditos OpenRouter
    if (msg.includes("credits") || msg.includes("max_tokens") || msg.includes("402")) {
      console.log("[ACS-AGENT] LLM credit/max_tokens fallback", msg.slice(0, 200));
      return {
        text: "Estoy con límite de créditos del LLM en este momento. Puedo seguir ayudándote con datos reales: revisa /products, /orders o /workflows, o dime qué buscas y te muestro resultados del catálogo.",
        toolCalls: [],
        directFallback: false,
        rawText: "",
        agentSlug: agent.slug,
      };
    }
    throw e;
  }

  // Agrega los tool calls de TODOS los pasos (result.toolCalls solo refleja el último)
  const stepToolCalls = ((result as unknown as { steps?: Array<{ toolCalls?: unknown[] }> }).steps ?? [])
    .flatMap((s) => s.toolCalls ?? []);

  // Si el LLM cortó sin texto (solo tool calls o respuesta vacía), genera respuesta
  // conversacional real vía llamada directa a OpenRouter.
  let finalText = (result.text ?? "").trim();
  let direct = false;
  if (!finalText && stepToolCalls.length > 0) {
    const apiKey = (params.useAdminKey && process.env.OPENROUTER_ADMIN_KEY) || process.env.OPENROUTER_API_KEY || "";
    if (apiKey) {
      const directReply = await directChat(apiKey, modelId, system, messages);
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
export async function* streamAgent(params: { agentSlug: string; input: string; storeId?: string; history?: unknown[]; useAdminKey?: boolean; _override?: { systemPrompt: string; model: string; allowedTools: string[] } }) {
  const { agent, system, modelId, allowedTools } = await resolveAgent(params);

  const model = getOpenRouter(params.useAdminKey).chat(modelId as never) as never;

  // Historial como mensajes con roles nativos (igual que en runAgent)
  const messages = toModelMessages(params.input, params.history);

  const result = streamText({
    model,
    system,
    messages,
    tools: toAISDKTools(allowedTools) as never,
    stopWhen: stepCountIs(4) as never,
    maxOutputTokens: 700,
  } as never);

  // Stream text chunks como IA que escribe
  for await (const chunk of result.textStream) {
    yield { type: "text" as const, text: chunk };
  }

  // Al final, emite toolCalls + meta (para que el frontend sepa navegar)
  const toolCalls = ((await result.toolCalls) ?? []) as unknown as Array<Record<string, unknown>>;
  let finalText = (await result.text) ?? "";
  // Si el LLM cortó sin texto (solo tool calls), genera respuesta conversacional
  // real vía llamada directa (misma lógica que runAgent, con contexto completo).
  if (!finalText.trim() && toolCalls.length > 0) {
    const apiKey = (params.useAdminKey && process.env.OPENROUTER_ADMIN_KEY) || process.env.OPENROUTER_API_KEY || "";
    if (apiKey) {
      const directReply = await directChat(apiKey, modelId, system, messages);
      if (directReply) finalText = directReply;
    }
  }
  yield { type: "done" as const, text: finalText, toolCalls, agentSlug: agent.slug };
}

export async function* streamStarShopFlow(params: { input: string; storeId?: string; history?: unknown[]; isAdmin?: boolean }) {
  const detected = await detectIntent(params.input, { isAdmin: params.isAdmin, history: params.history });
  const detectedIntent = detected.intent;

  // Usar cache de overrides si ya fue refresheado, o refrescarlo
  if (!crewOverridesCache) {
    await refreshCrewOverrides();
  }
  const crew = await getCrewConfig(detectedIntent);
  // Override validado del grafo (o config del código como fallback)

  logRouterWorkflow(params.input, detectedIntent, "ACS-ROUTER-STREAM");

  yield { type: "meta" as const, detectedIntent, crew: crew.slug, intentConfidence: detected.confidence, intentSource: detected.source };

  for await (const chunk of streamAgent({
    agentSlug: crew.slug,
    input: params.input,
    storeId: params.storeId,
    history: params.history,
    _override: { systemPrompt: crew.prompt, model: crew.model, allowedTools: crew.tools },
  } as never)) {
    yield chunk;
  }
}

// Wrapper non-streaming de runAgent con el flow StarShop (para compat con chat endpoint)
export async function runStarShopFlow(params: { input: string; storeId?: string; history?: unknown[]; isAdmin?: boolean }) {
  const detected = await detectIntent(params.input, { isAdmin: params.isAdmin, history: params.history });
  const detectedIntent = detected.intent;
  const crew = await getCrewConfig(detectedIntent);
  // Override validado del grafo (o config del código como fallback)
  logRouterWorkflow(params.input, detectedIntent, "ACS-ROUTER");
  const agentResult = await runAgent({
    agentSlug: crew.slug,
    input: params.input,
    storeId: params.storeId,
    history: params.history,
    _override: { systemPrompt: crew.prompt, model: crew.model, allowedTools: crew.tools },
  } as never);
  return {
    ...(agentResult as { text: string; toolCalls?: unknown[] }),
    detectedIntent,
    crew: crew.slug,
    intentConfidence: detected.confidence,
    intentSource: detected.source,
    toolCalls: (agentResult as { toolCalls?: unknown[] })?.toolCalls ?? [],
  };
}

const defaultExport = { runAgent, runAdminOps, streamAgent, runStarShopFlow, streamStarShopFlow, tools: ALL_TOOL_DEFS, clearCrewGraphCache };
export default defaultExport;
