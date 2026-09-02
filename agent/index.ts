/**
 * ACS Agent — EVE core
 * Orquesta `ai` SDK + tools + system prompt desde DB
 * Modelo estable demo: qwen/qwen3-30b-a3b-instruct-2507 ($0.05/1M) + fallback openrouter/free
 */
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { prisma } from "@/lib/adapters/prisma";
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
  const agent = await prisma.agent.findUnique({ where: { slug: params.agentSlug } });
  if (!agent) throw new Error(`Agent not found: ${params.agentSlug}`);

  const system = agent.systemPrompt ?? `Eres asistente de commerce para ${params.storeId ?? "tienda demo"}. Ayuda a buscar productos, verificar stock y comprar.`;
  // Modelo estable: qwen 30b pago barato con fallback a free router si es :free
  const modelId = agent.model ?? "qwen/qwen3-30b-a3b-instruct-2507";
  const model = openrouter.chat(modelId as never) as never;

  const result = await generateText({
    model,
    system,
    prompt: params.input,
    tools: toAISDKTools(),
    stopWhen: stepCountIs(10),
  });

  // Agrega los tool calls de TODOS los pasos (result.toolCalls solo refleja el último)
  const stepToolCalls = ((result as unknown as { steps?: Array<{ toolCalls?: unknown[] }> }).steps ?? [])
    .flatMap((s) => s.toolCalls ?? []);

  // Log run
  await prisma.agentRun.create({
    data: {
      agentId: agent.id,
      input: { text: params.input, storeId: params.storeId } as object,
      output: { text: result.text, toolCalls: stepToolCalls } as object,
      status: "COMPLETED",
    },
  });

  return { ...result, toolCalls: stepToolCalls };
}

export default { runAgent, tools: acsTools };
