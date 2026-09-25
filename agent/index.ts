/**
 * ACS Agent — EVE core
 * Orquesta `ai` SDK + tools + system prompt desde DB
 * Modelos StarShop: cadena gratis de Nemotron con respaldo automático (prisma/starshop-prompts.ts)
 */
import { generateText, stepCountIs, streamText, tool } from "ai";
import { z } from "zod";
import { headersFor, hasProviderKey, resolveModel, sdkModelFor } from "./lib/model-provider";
import { prisma } from "@/lib/adapters/prisma";
import { SALES_SYSTEM_PROMPT } from "../prisma/sales-system-prompt";
import { STARSHOP_CREWS, STARSHOP_CREW_FALLBACKS, STARSHOP_CREW_MODEL, STARSHOP_CREW_TOOLS, STARSHOP_LANGUAGE_RULE, STARSHOP_TRUTH_RULE, buildModelChain, isDailyFreeQuotaError, markModelExhausted, type StarShopIntent } from "../prisma/starshop-prompts";
import { getGraphCrewOverrides, clearCrewGraphCache as clearGraphCache, type GraphCrewOverride } from "./lib/crew-graph";
import { detectIntent } from "@/lib/eve/detect-intent";
import { isSmallTalk } from "./lib/search/normalize";
import { sanitizeReplyText, createToolCallTextFilter } from "./lib/sanitize-reply";
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
import getSalesSummary from "./tools/sales-summary";

// NOTA: la resolución de modelos por provider (OpenRouter / Groq) vive en
// agent/lib/model-provider.ts. Usar sdkModelFor() / resolveModel() / headersFor()
// en lugar de crear clientes de OpenRouter aquí.

// Llamada directa a OpenRouter como respaldo: genera respuesta conversacional real
// (el generateText con tools a veces corta en tool calls sin texto final).
// Recibe los mensajes ya construidos (historial + input) para NO perder el contexto.
// Usa la cadena de respaldo: si el modelo 1 falla, prueba el siguiente.
// Regla extra: los modelos de razonamiento (Nemotron) a veces escriben su
// chain-of-thought como respuesta final; con esto entregan SOLO la respuesta.
const DIRECT_REPLY_RULE =
  "\n\nFORMATO DE RESPUESTA: entrega DIRECTAMENTE la respuesta final al cliente, en español y en 1-3 frases. No muestres tu razonamiento, análisis, pasos internos ni texto en inglés.";
async function directChat(
  modelId: string,
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  for (const attemptModel of buildModelChain(modelId)) {
    const resolved = resolveModel(attemptModel);
    if (!resolved) continue;
    try {
      const body = {
        model: resolved.upstreamId,
        messages: [
          { role: "system", content: system + DIRECT_REPLY_RULE },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 700,
      };
      const r = await fetch(`${resolved.baseURL}/chat/completions`, {
        method: "POST",
        headers: headersFor(resolved),
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        console.log("[ACS-AGENT] directChat HTTP", r.status, attemptModel, t.slice(0, 200));
        // 429 por cuota diaria de free: marcar para no reintentar en los siguientes mensajes.
        if (r.status === 429 && isDailyFreeQuotaError(t)) markModelExhausted(attemptModel);
        continue;
      }
      const j = await r.json();
      // Sanea pseudo tool-calls y dumps de razonamiento (agent/lib/sanitize-reply.ts):
      // si el modelo solo devolvió eso, se intenta con el siguiente de la cadena.
      const text = sanitizeReplyText((j?.choices?.[0]?.message?.content ?? "").trim());
      if (text) return text;
    } catch (e) {
      console.log("[ACS-AGENT] directChat error", attemptModel, e instanceof Error ? e.message : e);
    }
  }
  return "";
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
const DEFAULT_MODEL = STARSHOP_CREW_MODEL;

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
  getSalesSummary,
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
  getSalesSummary: { description: getSalesSummary.description, inputSchema: getSalesSummary.inputSchema as z.ZodTypeAny, execute: getSalesSummary.execute as never },
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

// Allowlist de modelos: un typo en el editor jamas rompe el chat (se ignora el override).
// Los pagados van primero porque son los ÚNICOS que garantizan respuesta cuando la
// cuota diaria de los :free de OpenRouter está agotada (429 free-models-per-day).
const ALLOWED_MODELS: readonly string[] = [
  "openai/gpt-oss-120b",
  "qwen/qwen3-30b-a3b-instruct-2507",
  "meta-llama/llama-3.3-70b-instruct",
  "openai/gpt-4o-mini",
  "google/gemini-2.5-flash",
  STARSHOP_CREW_MODEL,
  ...STARSHOP_CREW_FALLBACKS,
];

/** Errores de "no disponible" del LLM (no bugs): sin créditos, saturado, red, 5xx. */
function isLlmUnavailable(msg: string): boolean {
  return /credits|402|429|rate.?limit|too many requests|max_tokens|no endpoints|overloaded|unavailable|timeout|timed out|ECONNRESET|ECONNREFUSED|ETIMEDOUT|fetch failed|\b5\d\d\b/i.test(msg);
}

/** Respuesta al cliente cuando toda la cadena de modelos falla (nunca un error crudo). */
const FALLBACK_TEXT = "Ahora mismo tengo mucha demanda en el servicio de IA y no pude generar la respuesta. Intenta de nuevo en unos minutos: te ayudo con catálogo, stock, precios y despacho. Si es urgente, escríbenos a ventas@starshop.cl.";

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
    // El id sintético `crew-<slug>` no existe en Agent y rompía la FK de AgentRun:
    // los logs de las conversaciones reales de StarShop se perdían. Se resuelve el
    // id real por slug; si la BD no responde, cae al id sintético (mismo fallback).
    const dbAgent = await prisma.agent
      .findUnique({ where: { slug: params.agentSlug }, select: { id: true } })
      .catch(() => null);
    return {
      agent: { id: dbAgent?.id ?? `crew-${params.agentSlug}`, slug: params.agentSlug, model: params._override.model, systemPrompt: params._override.systemPrompt },
      system: `${params._override.systemPrompt}\n\n${STARSHOP_LANGUAGE_RULE}\n\n${STARSHOP_TRUTH_RULE}`,
      modelId: params._override.model,
      allowedTools: params._override.allowedTools,
    };
  }
  const agent = (await getAgentConfig(params.agentSlug)) as ResolvedAgentConfig["agent"];
  return {
    agent,
    system: `${agent.systemPrompt ?? `Eres asistente de commerce para ${params.storeId ?? "tienda demo"}. Ayuda a buscar productos, verificar stock y comprar.`}\n\n${STARSHOP_LANGUAGE_RULE}\n\n${STARSHOP_TRUTH_RULE}`,
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

  // El historial se envía como mensajes previos con roles (user/assistant) para
  // que el modelo sepa exactamente quién dijo qué. El input actual siempre va al final.
  const messages = toModelMessages(params.input, params.history);

  // Cadena de respaldo: si el modelo configurado falla (402/429/red), se reintenta
  // con los siguientes modelos gratis ANTES de rendirse (ver buildModelChain).
  const chain = buildModelChain(modelId);
  let result: Awaited<ReturnType<typeof generateText>> | null = null;
  let usedModel = chain[0];
  let lastErr: unknown = null;
  for (const attemptModel of chain) {
    try {
      result = await generateText({
        model: sdkModelFor(attemptModel, params.useAdminKey) as never,
        system,
        messages,
        tools: toAISDKTools(allowedTools),
        stopWhen: stepCountIs(4) as never,
        maxOutputTokens: 700,
      } as never);
      usedModel = attemptModel;
      break;
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`[ACS-AGENT] runAgent modelo ${attemptModel} falló, probando siguiente`, msg.slice(0, 160));
      // 429 por cuota diaria de free: se marca agotado y se omite en los siguientes
      // mensajes (evita gastar N requests de cuota por cada mensaje del cliente).
      if (isDailyFreeQuotaError(msg)) markModelExhausted(attemptModel);
    }
  }

  if (!result) {
    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
    // Cadena agotada: si fue un problema de disponibilidad -> respuesta amigable;
    // si fue otra cosa (bug real) se propaga el error como antes.
    if (isLlmUnavailable(msg)) {
      console.log("[ACS-AGENT] runAgent sin modelos disponibles", msg.slice(0, 200));
      return {
        text: FALLBACK_TEXT,
        toolCalls: [],
        directFallback: false,
        rawText: "",
        modelUsed: null,
        agentSlug: agent.slug,
      };
    }
    throw lastErr;
  }

  if (usedModel !== chain[0]) console.log(`[ACS-AGENT] runAgent respondió con respaldo ${usedModel}`);

  // Agrega los tool calls de TODOS los pasos (result.toolCalls solo refleja el último)
  const stepToolCalls = ((result as unknown as { steps?: Array<{ toolCalls?: unknown[] }> }).steps ?? [])
    .flatMap((s) => s.toolCalls ?? []);

  // Si el LLM cortó sin texto (solo tool calls) o solo escribió un pseudo
  // tool-call como texto (Nemotron a veces lo hace), genera respuesta
  // conversacional real vía llamada directa a OpenRouter.
  const rawText = (result.text ?? "").trim();
  let finalText = sanitizeReplyText(rawText);
  let direct = false;
  if (!finalText && (rawText || stepToolCalls.length > 0)) {
    const hasKey = hasProviderKey("openrouter", params.useAdminKey) || hasProviderKey("groq");
    if (hasKey) {
      const directReply = await directChat(modelId, system, messages);
      if (directReply) {
        finalText = directReply;
        direct = true;
      }
    }
    // La cadena tampoco dio texto usable: mensaje amigable antes que devolver JSON crudo.
    if (!finalText && rawText) finalText = FALLBACK_TEXT;
  }

  // Log run (no bloquea la respuesta si la BD falla)
  await logRunSafe({
    agentId: agent.id,
    input: { text: params.input, storeId: params.storeId, crew: params.agentSlug } as object,
    output: { text: finalText || rawText, toolCalls: stepToolCalls } as object,
    status: "COMPLETED",
  });

  return { ...result, text: finalText, rawText: result.text, directFallback: direct, toolCalls: stepToolCalls, modelUsed: usedModel, agentSlug: agent.slug };
}

// ── Streaming: mismo router pero con streamText para efecto tipeo IA ──
export async function* streamAgent(params: { agentSlug: string; input: string; storeId?: string; history?: unknown[]; useAdminKey?: boolean; _override?: { systemPrompt: string; model: string; allowedTools: string[] } }) {
  const { agent, system, modelId, allowedTools } = await resolveAgent(params);

  // Historial como mensajes con roles nativos (igual que en runAgent)
  const messages = toModelMessages(params.input, params.history);

  // Cadena de respaldo: solo se reintenta si el modelo falla ANTES de emitir texto
  // (una vez enviado el primer chunk no se puede repetir sin duplicar la respuesta).
  const chain = buildModelChain(modelId);
  let lastErr: unknown = null;
  for (const attemptModel of chain) {
    let yielded = false;
    try {
      const model = sdkModelFor(attemptModel, params.useAdminKey);
      const result = streamText({
        model,
        system,
        messages,
        tools: toAISDKTools(allowedTools) as never,
        stopWhen: stepCountIs(4) as never,
        maxOutputTokens: 700,
      } as never);

      // Stream text chunks como IA que escribe. El filtro retiene los pseudo
      // tool-calls escritos como texto para que no lleguen al usuario.
      const textFilter = createToolCallTextFilter();
      for await (const chunk of result.textStream) {
        const emit = textFilter.push(chunk);
        if (!emit) continue;
        yielded = true;
        yield { type: "text" as const, text: emit };
      }
      const tail = textFilter.flush();
      if (tail) {
        yielded = true;
        yield { type: "text" as const, text: tail };
      }

      // Al final, emite toolCalls + meta (para que el frontend sepa navegar)
      const toolCalls = ((await result.toolCalls) ?? []) as unknown as Array<Record<string, unknown>>;
      const rawFinal = ((await result.text) ?? "").trim();
      let finalText = sanitizeReplyText(rawFinal);
      // Si el LLM cortó sin texto (solo tool calls) o solo escribió un pseudo
      // tool-call como texto, genera la respuesta conversacional de respaldo
      // (misma lógica que runAgent, con contexto completo).
      if (!finalText && (rawFinal || toolCalls.length > 0)) {
        const hasKey = hasProviderKey("openrouter", params.useAdminKey) || hasProviderKey("groq");
        if (hasKey) {
          const directReply = await directChat(attemptModel, system, messages);
          if (directReply) finalText = directReply;
        }
        if (!finalText && rawFinal) finalText = FALLBACK_TEXT;
      }
      if (attemptModel !== chain[0]) console.log(`[ACS-AGENT] streamAgent respondió con respaldo ${attemptModel}`);
      yield { type: "done" as const, text: finalText, toolCalls, agentSlug: agent.slug };
      return;
    } catch (e) {
      lastErr = e;
      if (yielded) throw e; // ya se envió texto al cliente: no reintentar (evita duplicar)
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`[ACS-AGENT] streamAgent modelo ${attemptModel} falló, probando siguiente`, msg.slice(0, 160));
      // 429 por cuota diaria de free: marcar para no reintentar en los siguientes mensajes.
      if (isDailyFreeQuotaError(msg)) markModelExhausted(attemptModel);
    }
  }

  // Cadena agotada: saturación/sin cupo -> mensaje amigable en vez de error crudo.
  const lastMsg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  if (isLlmUnavailable(lastMsg)) {
    console.log("[ACS-AGENT] streamAgent sin modelos disponibles", lastMsg.slice(0, 200));
    yield { type: "done" as const, text: FALLBACK_TEXT, toolCalls: [], agentSlug: agent.slug };
    return;
  }
  throw lastErr;
}

export async function* streamStarShopFlow(params: { input: string; storeId?: string; history?: unknown[]; isAdmin?: boolean }) {
  const detected = await detectIntent(params.input, { isAdmin: params.isAdmin, history: params.history });
  const detectedIntent = detected.intent;
  // Charla social: sin tools (no hay nada que buscar/navegar); el crew de soporte responde.
  const smallTalk = isSmallTalk(params.input);

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
    _override: { systemPrompt: crew.prompt + audienceNote(detectedIntent, params.isAdmin), model: crew.model, allowedTools: smallTalk ? [] : crew.tools },
  } as never)) {
    yield chunk;
  }
}

/**
 * Quién habla en ESTA conversación (el modelo no lo sabe si no se lo dices).
 * Sin esto, admin_ops declina métricas creyendo que habla con un cliente.
 */
function audienceNote(detectedIntent: StarShopIntent, isAdmin?: boolean): string {
  if (detectedIntent === "admin_ops" && isAdmin) {
    return "\n\nCONTEXTO DE ESTA CONVERSACIÓN: hablas con el DUEÑO autenticado de la tienda. Tienes permiso total: llama a getSalesSummary y entrega las cifras reales con el formato indicado. Nada de declinar.";
  }
  if (!isAdmin) {
    return "\n\nCONTEXTO DE ESTA CONVERSACIÓN: hablas con un CLIENTE de la tienda StarShop (NO es el dueño). Nunca reveles ingresos ni métricas internas; ayuda con catálogo, stock y su compra.";
  }
  return "";
}

// Wrapper non-streaming de runAgent con el flow StarShop (para compat con chat endpoint)
export async function runStarShopFlow(params: { input: string; storeId?: string; history?: unknown[]; isAdmin?: boolean }) {
  const detected = await detectIntent(params.input, { isAdmin: params.isAdmin, history: params.history });
  const detectedIntent = detected.intent;
  const crew = await getCrewConfig(detectedIntent);
  // Charla social: sin tools (no hay nada que buscar/navegar); el crew de soporte responde.
  const smallTalk = isSmallTalk(params.input);
  // Override validado del grafo (o config del código como fallback)
  logRouterWorkflow(params.input, detectedIntent, "ACS-ROUTER");
  const agentResult = await runAgent({
    agentSlug: crew.slug,
    input: params.input,
    storeId: params.storeId,
    history: params.history,
    _override: { systemPrompt: crew.prompt + audienceNote(detectedIntent, params.isAdmin), model: crew.model, allowedTools: smallTalk ? [] : crew.tools },
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
