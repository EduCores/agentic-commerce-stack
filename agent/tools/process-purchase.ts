import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";
import { startWorkflow } from "@/lib/workflows/engine";
import { processOrderWorkflow } from "@/workflows/process-order";

/**
 * Puente 1: EVE → Vercel Workflows (IA → Ejecución)
 * El agente detecta intención transaccional y dispara workflow durable.
 */
export default defineTool({
  description: "Inicia el proceso seguro de compra y reserva de stock.",
  inputSchema: z.object({
    orderId: z.string().describe("ID del pedido a procesar"),
  }),
  async execute({ orderId }) {
    const run = await startWorkflow(processOrderWorkflow, { orderId });
    return { status: "Workflow iniciado", workflowRunId: run.id };
  },
});
