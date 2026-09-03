/**
 * ACS Agent — EVE core
 * Orquesta `ai` SDK + tools + system prompt desde DB
 * Modelo estable demo: qwen/qwen3-30b-a3b-instruct-2507 ($0.05/1M) + fallback openrouter/free
 */
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { prisma } from "@/lib/adapters/prisma";
import { SALES_SYSTEM_PROMPT } from "../prisma/sales-system-prompt";
import processPurchase from "./tools/process-purchase";
import checkStock from "./tools/check-stock";
import searchProducts from "./tools/search-products";
import cancelOrder from "./tools/cancel-order";
import navigateTo from "./tools/navigate";
import calculatePricing from "./tools/calculate-pricing";
import checkout from "./tools/checkout";

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

// Registry para UI y para `ai` SDK
export const acsTools = {
  processPurchase,
  checkStock,
  searchProducts,
  cancelOrder,
  navigateTo,
  calculatePricing,
  checkout,
};

function toAISDKTools() {
  return {
    processPurchase: tool({
      description: processPurchase.description,
      inputSchema: processPurchase.inputSchema as z.ZodTypeAny,
      execute: processPurchase.execute as never,
    }),
    checkStock: tool({
      description: checkStock.description,
      inputSchema: checkStock.inputSchema as z.ZodTypeAny,
      execute: checkStock.execute as never,
    }),
    searchProducts: tool({
      description: searchProducts.description,
      inputSchema: searchProducts.inputSchema as z.ZodTypeAny,
      execute: searchProducts.execute as never,
    }),
    cancelOrder: tool({
      description: cancelOrder.description,
      inputSchema: cancelOrder.inputSchema as z.ZodTypeAny,
      execute: cancelOrder.execute as never,
    }),
    navigateTo: tool({
      description: navigateTo.description,
      inputSchema: navigateTo.inputSchema as z.ZodTypeAny,
      execute: navigateTo.execute as never,
    }),
    calculatePricing: tool({
      description: calculatePricing.description,
      inputSchema: calculatePricing.inputSchema as z.ZodTypeAny,
      execute: calculatePricing.execute as never,
    }),
    checkout: tool({
      description: checkout.description,
      inputSchema: checkout.inputSchema as z.ZodTypeAny,
      execute: checkout.execute as never,
    }),
  };
}

export async function runAgent(params: { agentSlug: string; input: string; storeId?: string }) {
  const agent = await getAgentConfig(params.agentSlug);
  const system = agent.systemPrompt ?? `Eres asistente de commerce para ${params.storeId ?? "tienda demo"}. Ayuda a buscar productos, verificar stock y comprar.`;
  // Modelo estable: qwen 30b pago barato con fallback a free router si es :free
  const modelId = agent.model ?? "qwen/qwen3-30b-a3b";
  const model = openrouter.chat(modelId as never) as never;

  const result = await generateText({
    model,
    system,
    prompt: params.input,
    tools: toAISDKTools(),
    stopWhen: stepCountIs(3),
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
    input: { text: params.input, storeId: params.storeId } as object,
    output: { text: finalText || result.text, toolCalls: stepToolCalls } as object,
    status: "COMPLETED",
  });

  return { ...result, text: finalText, rawText: result.text, directFallback: direct, toolCalls: stepToolCalls };
}

export default { runAgent, tools: acsTools };
