/**
 * Email Agent — ACS
 * Workflow durable de emails automáticos. Centraliza el envío transaccional
 * en un solo camino (sendTransactionalEmail → plantilla BD → Resend/mock)
 * y deja cada paso en OrderStepLog para que XYFlow lo pinte en /workflows.
 *
 * Eventos soportados:
 * - 2fa_code / password_reset: login y recuperación de acceso (sign-in-form)
 * - order_confirmation / abandoned_cart / return_update: emails de commerce
 * - general: mensaje libre
 *
 * IMPORTANTE: el cron de carritos (/api/cron/emails) y las secuencias de
 * EmailSequence NO pasan por aquí (tienen su propio motor con waits) — este
 * workflow es para envíos INMEDIATOS por evento, sin duplicar lógica.
 */
import { createWorkflow, createStep, logStep, startWorkflow } from "@/lib/workflows/engine";
import type { EmailVars } from "@/lib/emails/templates";

/** Trigger del evento de email (define la plantilla por defecto). */
export type EmailAgentTrigger =
  | "2fa_code"
  | "password_reset"
  | "order_confirmation"
  | "abandoned_cart"
  | "return_update"
  | "general";

export type EmailAgentInput = {
  trigger: EmailAgentTrigger;
  /** Destinatario (se normaliza a minúsculas). */
  to: string;
  subject?: string;
  /** Cuerpo texto plano (si no se provee, lo genera la plantilla). */
  text?: string;
  html?: string;
  orderId?: string;
  /** Sobrescribe la plantilla derivada del trigger. */
  templateKey?: string;
  vars?: EmailVars;
  workflowRunId?: string;
};

/** Plantilla por defecto por trigger (mismas claves que BUILTIN_TEMPLATE_KEYS). */
const TRIGGER_TEMPLATE: Record<EmailAgentTrigger, string> = {
  "2fa_code": "general",
  password_reset: "general",
  order_confirmation: "order_confirmation",
  abandoned_cart: "abandoned_cart",
  return_update: "return_update",
  general: "general",
};

type PreparedEmail = EmailAgentInput & { to: string; templateKey: string };

/** Paso 1 — valida y normaliza el destinatario. */
export const validateRecipientStep = createStep<EmailAgentInput, PreparedEmail>(
  "validate-recipient",
  async (input) => {
    const to = (input.to ?? "").trim().toLowerCase();
    if (!to || !to.includes("@")) throw new Error(`Email inválido: ${input.to}`);
    const prepared: PreparedEmail = {
      ...input,
      to,
      templateKey: input.templateKey ?? TRIGGER_TEMPLATE[input.trigger] ?? "general",
    };
    await logStep({
      workflowRunId: input.workflowRunId,
      orderId: input.orderId,
      nodeId: "check-1",
      stepName: "VALIDATE_RECIPIENT",
      status: "COMPLETED",
      input: { to, trigger: input.trigger },
      output: { templateKey: prepared.templateKey },
    });
    return prepared;
  }
);

/** Paso 2 — resuelve plantilla + asunto (render efectivo lo hace send en paso 3). */
export const renderTemplateStep = createStep<PreparedEmail, PreparedEmail>(
  "render-template",
  async (input) => {
    await logStep({
      workflowRunId: input.workflowRunId,
      orderId: input.orderId,
      nodeId: "render-1",
      stepName: "RENDER_TEMPLATE",
      status: "COMPLETED",
      input: { templateKey: input.templateKey, subject: input.subject ?? "(de plantilla)" },
      output: { trigger: input.trigger },
    });
    return input;
  }
);

/** Paso 3 — envío real (Resend en prod, mock en dev sin RESEND_API_KEY). */
export const sendEmailStep = createStep<
  PreparedEmail,
  { ok: boolean; mocked: boolean; subject: string; id?: string }
>(
  "send-email",
  async (input) => {
    await logStep({
      workflowRunId: input.workflowRunId,
      orderId: input.orderId,
      nodeId: "send-1",
      stepName: "SEND_EMAIL",
      status: "RUNNING",
      input: { to: input.to, templateKey: input.templateKey },
    });
    const { sendTransactionalEmail } = await import("@/lib/emails/send");
    const result = await sendTransactionalEmail({
      to: input.to,
      templateKey: input.templateKey,
      subject: input.subject,
      text: input.text,
      html: input.html,
      orderId: input.orderId,
      vars: { nombre: input.to, pedido: input.orderId ?? "", ...input.vars },
    });
    await logStep({
      workflowRunId: input.workflowRunId,
      orderId: input.orderId,
      nodeId: "send-1",
      stepName: "SEND_EMAIL",
      status: result.ok ? "COMPLETED" : "FAILED",
      output: { ok: result.ok, mocked: result.mocked, subject: result.subject, id: result.id ?? null },
      error: result.error,
    });
    if (!result.ok) throw new Error(result.error ?? "No se pudo enviar el email");
    return { ok: result.ok, mocked: result.mocked, subject: result.subject, id: result.id };
  }
);

export const emailAgentWorkflow = createWorkflow<EmailAgentInput>(
  "email-agent",
  async (input) => {
    const prepared = await validateRecipientStep.fn(input);
    const rendered = await renderTemplateStep.fn(prepared);
    const sent = await sendEmailStep.fn(rendered);
    return { ok: sent.ok, mocked: sent.mocked, subject: sent.subject, to: rendered.to };
  }
);

/**
 * Ejecuta el workflow ESPERANDO el envío (awaited) — el caller responde después
 * de que el correo salga (o falle), igual que antes con sendEmail.execute().
 * Nunca lanza: devuelve el estado del run para que los routes sigan respondiendo ok.
 */
export async function dispatchEmailEvent(
  input: EmailAgentInput
): Promise<{ id: string; status: string }> {
  return startWorkflow(emailAgentWorkflow, input, { wait: true });
}

// ── Grafo XYFlow (fuente del seed / sync-router-graph) ───────────────────────

export const emailAgentSteps = ["VALIDATE_RECIPIENT", "RENDER_TEMPLATE", "SEND_EMAIL"];

export const emailAgentGraph = {
  nodes: [
    {
      id: "trigger-1",
      type: "base",
      position: { x: 250, y: 20 },
      data: {
        label: "Email Event Trigger",
        description: "Evento de email: login 2FA, reset de acceso, pedido o carrito.",
        detail: "Lo disparan /api/auth/2fa/request y /api/auth/reset-request (vía dispatchEmailEvent). El trigger define la plantilla: 2fa_code/password_reset → general.",
        type: "trigger",
        status: "idle",
        tools: ["sendEmail"],
      },
    },
    {
      id: "check-1",
      type: "base",
      position: { x: 250, y: 160 },
      data: {
        label: "Validate Recipient",
        description: "Valida y normaliza el email destinatario.",
        detail: "Paso VALIDATE_RECIPIENT. Lowercase + debe contener @; si no, el run falla sin enviar nada.",
        type: "condition",
        status: "idle",
      },
    },
    {
      id: "render-1",
      type: "base",
      position: { x: 250, y: 300 },
      data: {
        label: "Render Template",
        description: "Resuelve plantilla por trigger (BD editable en /admin/emails).",
        detail: "Paso RENDER_TEMPLATE. templateKey = el explícito o el del trigger; si la plantilla activa falta en BD, cae a las del código (send.ts renderFromCode).",
        type: "email_send",
        status: "idle",
      },
    },
    {
      id: "send-1",
      type: "base",
      position: { x: 250, y: 440 },
      data: {
        label: "Send Email",
        description: "Envío real con Resend (mock en dev sin RESEND_API_KEY).",
        detail: "Paso SEND_EMAIL. sendTransactionalEmail → Resend API + EmailLog. Sin API key solo loguea (mock) y el run igual completa.",
        type: "email_send",
        status: "idle",
        tools: ["sendEmail"],
      },
    },
  ],
  edges: [
    { id: "e1", source: "trigger-1", target: "check-1" },
    { id: "e2", source: "check-1", target: "render-1" },
    { id: "e3", source: "render-1", target: "send-1" },
  ],
};

