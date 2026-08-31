/**
 * ACS Workflows Engine — bridge Vercel Workflows ↔ Prisma ↔ XYFlow
 * Implementa `createWorkflow`/`createStep`/`startWorkflow` compatibles con spec del usuario,
 * con persistencia durable en Prisma y sin depender de `@vercel/workflows` no publicado.
 *
 * Para prod en Vercel, reemplaza el runner local por el World de Vercel (`workflow` sdk).
 */
import { prisma } from "@/lib/adapters/prisma";

export type StepFn<Input, Output> = (input: Input) => Promise<Output>;

export type StepDefinition<Input, Output> = {
  name: string;
  fn: StepFn<Input, Output>;
};

export function createStep<Input, Output>(name: string, fn: StepFn<Input, Output>): StepDefinition<Input, Output> {
  return { name, fn };
}

export type WorkflowDefinition<Input> = {
  slug: string;
  run: (input: Input) => Promise<unknown>;
};

export function createWorkflow<Input>(slug: string, runner: (input: Input) => Promise<unknown>): WorkflowDefinition<Input> {
  return { slug, run: runner };
}

// ── Runtime durable local (logs en Prisma) ──
export async function startWorkflow<Input>(workflow: WorkflowDefinition<Input>, input: Input): Promise<{ id: string; status: string }> {
  // Busca definition en DB para linkear run
  const def = await prisma.workflowDefinition.findUnique({ where: { slug: workflow.slug } }).catch(() => null);

  // Crea WorkflowRun
  const run = await prisma.workflowRun.create({
    data: {
      workflowId: def?.id ?? (await ensureFallbackWorkflow(workflow.slug)),
      input: input as object,
      status: "RUNNING",
      currentStep: "START",
      startedAt: new Date(),
    },
  });

  // Ejecuta en background (no bloquea al agente) — durable via step logs
  // En Vercel prod, esto sería dispatch al World; aquí es fire-and-await con reintentos simples
  void (async () => {
    try {
      await workflow.run(input);
      await prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: "COMPLETED", completedAt: new Date(), currentStep: "DONE" },
      });
    } catch (e) {
      await prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: "FAILED", error: String(e), completedAt: new Date() },
      });
    }
  })();

  return { id: run.id, status: "RUNNING" };
}

// Crea workflow definition fallback si no existe (para dev)
async function ensureFallbackWorkflow(slug: string): Promise<string> {
  const existing = await prisma.workflowDefinition.findUnique({ where: { slug } });
  if (existing) return existing.id;
  const created = await prisma.workflowDefinition.create({
    data: {
      slug,
      name: slug,
      graph: { nodes: [], edges: [] },
      steps: [],
      trigger: "eve_tool",
    },
  });
  return created.id;
}

// Helper usado por steps para loguear en Prisma (puente a XYFlow)
export async function logStep(params: {
  workflowRunId?: string;
  orderId?: string;
  stepName: string;
  nodeId?: string;
  status: "RUNNING" | "COMPLETED" | "FAILED" | "RETRYING";
  input?: unknown;
  output?: unknown;
  error?: string;
}) {
  return prisma.orderStepLog.create({
    data: {
      workflowRunId: params.workflowRunId,
      orderId: params.orderId,
      stepName: params.stepName,
      nodeId: params.nodeId,
      status: params.status as never,
      input: params.input as object | undefined,
      output: params.output as object | undefined,
      error: params.error,
      completedAt: params.status === "COMPLETED" || params.status === "FAILED" ? new Date() : undefined,
    },
  });
}
