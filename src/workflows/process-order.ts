/**
 * Puente 2: Vercel Workflows → XYFlow (Ejecución → Interfaz)
 * Workflow durable que guarda estado en Prisma para que XYFlow lo pinte en tiempo real.
 */
import { createWorkflow, createStep } from "@/lib/workflows/engine";
import { fulfillOrderStep, processPaymentStep, reserveStockStep } from "@/lib/workflows/steps";

const updateStepStatus = createStep<{ orderId: string; stepName: string; workflowRunId?: string }, unknown>(
  "update-status",
  async ({ orderId, stepName, workflowRunId }) => {
    const { logStep } = await import("@/lib/workflows/engine");
    return logStep({ orderId, stepName, workflowRunId, status: "COMPLETED" });
  }
);

export const processOrderWorkflow = createWorkflow<{ orderId: string; workflowRunId?: string }>(
  "process-order",
  async ({ orderId, workflowRunId }) => {
    await reserveStockStep({ orderId, workflowRunId });
    await updateStepStatus.fn({ orderId, stepName: "RESERVE_STOCK", workflowRunId });

    await processPaymentStep({ orderId, workflowRunId });
    await updateStepStatus.fn({ orderId, stepName: "PROCESS_PAYMENT", workflowRunId });

    await fulfillOrderStep({ orderId, workflowRunId });
    await updateStepStatus.fn({ orderId, stepName: "FULFILL", workflowRunId });

    return { orderId, status: "FULFILLED" };
  }
);
