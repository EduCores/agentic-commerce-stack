/**
 * ACS EVE Tool Bridge — compatible con `import { defineTool } from 'eve/tools'`
 * Abstrae `eve` (Adobe) vs EVE agéntico ACS. Usa `ai` SDK + zod + Vercel Workflows.
 *
 * Contrato esperado por el usuario:
 *   import { defineTool } from 'eve/tools';
 *   export default defineTool({ description, inputSchema: z.object(...), execute })
 *
 * Este shim permite que `agent/tools/*` funcione sin depender del paquete `eve` incorrecto.
 */
import { z } from "zod";

export type ToolDefinition<Input, Output> = {
  description: string;
  inputSchema: z.ZodType<Input>;
  execute: (input: Input) => Promise<Output>;
  // metadata para registry
  name?: string;
};

export function defineTool<Input, Output>(def: ToolDefinition<Input, Output>): ToolDefinition<Input, Output> {
  return def;
}

// Helper para exponer tools al agente `ai` SDK (tool calling)
export function toAISDKTool<Input, Output>(tool: ToolDefinition<Input, Output>) {
  return {
    description: tool.description,
    parameters: tool.inputSchema as unknown as z.ZodTypeAny,
    execute: tool.execute,
  };
}

// Registry simple para UI admin
const registry = new Map<string, ToolDefinition<unknown, unknown>>();

export function registerTool(name: string, tool: ToolDefinition<unknown, unknown>) {
  registry.set(name, tool);
}

export function listTools() {
  return Array.from(registry.entries()).map(([name, tool]) => ({ name, description: tool.description }));
}
