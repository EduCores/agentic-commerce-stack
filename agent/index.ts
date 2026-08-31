/**
 * ACS Agent — EVE core
 * Orquesta `ai` SDK + tools + system prompt desde DB
 */
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/adapters/prisma";
import processPurchase from "./tools/process-purchase";
import checkStock from "./tools/check-stock";
import searchProducts from "./tools/search-products";
import cancelOrder from "./tools/cancel-order";

// Registry para UI y para `ai` SDK
export const acsTools = {
  processPurchase,
  checkStock,
  searchProducts,
  cancelOrder,
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
  };
}

export async function runAgent(params: { agentSlug: string; input: string; storeId?: string }) {
  const agent = await prisma.agent.findUnique({ where: { slug: params.agentSlug } });
  if (!agent) throw new Error(`Agent not found: ${params.agentSlug}`);

  const system = agent.systemPrompt ?? `Eres asistente de commerce para ${params.storeId ?? "tienda demo"}. Ayuda a buscar productos, verificar stock y comprar.`;

  const result = await generateText({
    model: agent.model as never, // ai SDK resuelve via provider (openai, etc) — configura AI_GATEWAY/API_KEY en env
    system,
    prompt: params.input,
    tools: toAISDKTools(),
    stopWhen: stepCountIs(5),
  });

  // Log run
  await prisma.agentRun.create({
    data: {
      agentId: agent.id,
      input: { text: params.input, storeId: params.storeId } as object,
      output: { text: result.text, toolCalls: result.toolCalls } as object,
      status: "COMPLETED",
    },
  });

  return result;
}

export default { runAgent, tools: acsTools };
