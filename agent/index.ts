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
import { STARSHOP_CREWS, STARSHOP_LANGUAGE_RULE, type StarShopIntent } from "../prisma/starshop-prompts";
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
const DEFAULT_MODEL = "qwen/qwen3-30b-a3b-instruct-2507";

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
const CREW_TOOL_MAP: Record<StarShopIntent, string[]> = {
  product_search: ["searchProducts", "checkStock", "calculatePricing", "navigateTo", "scrapeWebsite"],
  price_comparison: ["searchProducts", "scrapeWebsite", "calculatePricing"],
  checkout_support: ["checkStock", "calculatePricing", "checkout", "processPurchase", "navigateTo", "sendEmail"],
  general_inquiry: ["scrapeWebsite", "navigateTo"],
  abandoned_cart: ["sendEmail", "searchProducts", "calculatePricing"],
  return_request: ["scrapeWebsite", "sendEmail", "searchProducts", "orderTracking"],
  order_tracking: ["orderTracking", "sendEmail", "scrapeWebsite"],
  escalate_human: ["sendEmail"],
  admin_ops: ["searchProducts", "checkStock", "orderTracking", "scrapeWebsite", "sendEmail"],
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
    admin_ops: { slug: STARSHOP_CREWS.admin_ops.slug, prompt: STARSHOP_CREWS.admin_ops.prompt, model: STARSHOP_CREWS.admin_ops.model },
  };
  return map[intent];
}

export type RunAgentResult = Awaited<ReturnType<typeof runAgent>>;

/** Flujo 1→2→6+3→4 — detecta intent (LLM con fallback heurístico) y despacha al crew */
export async function runStarShopFlow(params: { input: string; storeId?: string; history?: unknown[]; isAdmin?: boolean }) {
  const { detectIntent } = await import("@/lib/eve/detect-intent");
  // La clasificación considera el historial para no cambiar de crew a mitad de conversación.
  const detected = await detectIntent(params.input, { isAdmin: params.isAdmin, history: params.history });
  const detectedIntent: StarShopIntent = detected.intent;

  const crew = getCrewConfig(detectedIntent);
  const allowedTools = CREW_TOOL_MAP[detectedIntent] ?? Object.keys(ALL_TOOL_DEFS);

  // Ejecuta el workflow router en background para observabilidad (no bloquea respuesta)
  void (async () => {
    try {
      const { starShopRouterWorkflow } = await import("@/workflows/starshop-router");
      const { startWorkflow } = await import("@/lib/workflows/engine");
      await startWorkflow(starShopRouterWorkflow, { message: params.input, detectedIntent, orderId: undefined });
    } catch (e) {
      console.log("[ACS-ROUTER] workflow log failed", e instanceof Error ? e.message : e);
    }
  })();

  // Delega al runAgent del crew con historial (runAgent arma los mensajes UNA sola vez)
  const inner = await runAgent({
    agentSlug: crew.slug,
    input: params.input,
    storeId: params.storeId,
    history: params.history,
    _override: { systemPrompt: crew.prompt, model: crew.model, allowedTools },
  } as never);

  return { ...inner, detectedIntent, crew: crew.slug, allowedTools, intentConfidence: detected.confidence, intentSource: detected.source };
}

/**
 * Admin Ops dedicado — NO usa heurística, siempre crew admin_ops.
 * Endpoint separado /api/admin/chat: sin flag que olvidar, sin tildes que fallar,
 * sin fuga a tienda, con key propia (OPENROUTER_ADMIN_KEY).
 */
export async function runAdminOps(params: { input: string; storeId?: string; history?: unknown[] }) {
  const detectedIntent: StarShopIntent = "admin_ops";
  const crew = getCrewConfig(detectedIntent);
  const allowedTools = CREW_TOOL_MAP[detectedIntent] ?? Object.keys(ALL_TOOL_DEFS);

  void (async () => {
    try {
      const { starShopRouterWorkflow } = await import("@/workflows/starshop-router");
      const { startWorkflow } = await import("@/lib/workflows/engine");
      await startWorkflow(starShopRouterWorkflow, { message: params.input, detectedIntent, orderId: undefined });
    } catch (e) {
      console.log("[ACS-ADMIN] workflow log failed", e instanceof Error ? e.message : e);
    }
  })();

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
  let agent: { id: string; slug: string; model: string | null; systemPrompt: string | null };
  let system: string;
  let modelId: string;
  let allowedTools: string[] | undefined;

  if (params._override) {
    agent = { id: `crew-${params.agentSlug}`, slug: params.agentSlug, model: params._override.model, systemPrompt: params._override.systemPrompt };
    system = `${params._override.systemPrompt}\n\n${STARSHOP_LANGUAGE_RULE}`;
    modelId = params._override.model;
    allowedTools = params._override.allowedTools;
  } else {
    agent = await getAgentConfig(params.agentSlug) as never;
    system = `${agent.systemPrompt ?? `Eres asistente de commerce para ${params.storeId ?? "tienda demo"}. Ayuda a buscar productos, verificar stock y comprar.`}\n\n${STARSHOP_LANGUAGE_RULE}`;
    modelId = agent.model ?? DEFAULT_MODEL;
  }

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
      } as unknown as typeof result & { text: string; toolCalls: unknown[]; directFallback: boolean; rawText: string; agentSlug: string };
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
export async function* streamAgent(params: { agentSlug: string; input: string; storeId?: string; history?: unknown[]; _override?: { systemPrompt: string; model: string; allowedTools: string[] } }) {
  let agent: { id: string; slug: string; model: string | null; systemPrompt: string | null };
  let system: string;
  let modelId: string;
  let allowedTools: string[] | undefined;

  if (params._override) {
    agent = { id: `crew-${params.agentSlug}`, slug: params.agentSlug, model: params._override.model, systemPrompt: params._override.systemPrompt };
    system = `${params._override.systemPrompt}\n\n${STARSHOP_LANGUAGE_RULE}`;
    modelId = params._override.model;
    allowedTools = params._override.allowedTools;
  } else {
    agent = (await getAgentConfig(params.agentSlug)) as never;
    system = `${agent.systemPrompt ?? `Eres asistente de commerce para ${params.storeId ?? "tienda demo"}. Ayuda a buscar productos, verificar stock y comprar.`}\n\n${STARSHOP_LANGUAGE_RULE}`;
    modelId = agent.model ?? DEFAULT_MODEL;
  }

  const model = openrouter.chat(modelId as never) as never;

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
    const apiKey = process.env.OPENROUTER_API_KEY || "";
    if (apiKey) {
      const directReply = await directChat(apiKey, modelId, system, messages);
      if (directReply) finalText = directReply;
    }
  }
  yield { type: "done" as const, text: finalText, toolCalls, agentSlug: agent.slug };
}

export async function* streamStarShopFlow(params: { input: string; storeId?: string; history?: unknown[]; isAdmin?: boolean }) {
  const { detectIntent } = await import("@/lib/eve/detect-intent");
  const detected = await detectIntent(params.input, { isAdmin: params.isAdmin, history: params.history });
  const detectedIntent = detected.intent;
  const crew = getCrewConfig(detectedIntent);
  const allowedTools = CREW_TOOL_MAP[detectedIntent] ?? Object.keys(ALL_TOOL_DEFS);

  void (async () => {
    try {
      const { starShopRouterWorkflow } = await import("@/workflows/starshop-router");
      const { startWorkflow } = await import("@/lib/workflows/engine");
      await startWorkflow(starShopRouterWorkflow, { message: params.input, detectedIntent, orderId: undefined });
    } catch (e) {
      console.log("[ACS-ROUTER-STREAM] workflow log failed", e instanceof Error ? e.message : e);
    }
  })();

  yield { type: "meta" as const, detectedIntent, crew: crew.slug, intentConfidence: detected.confidence, intentSource: detected.source };

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

export default { runAgent, runAdminOps, streamAgent, runStarShopFlow, streamStarShopFlow, tools: acsTools };
