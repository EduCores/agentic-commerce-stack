/**
 * Envío transaccional central — ACS.
 * Usa la plantilla activa de la BD (editable en /admin/emails); si no existe,
 * usa las plantillas del código. Sin RESEND_API_KEY hace mock (no falla).
 * Todo envío queda en EmailLog (nunca rompe el flujo si la BD falla).
 */
import { prisma } from "@/lib/adapters/prisma";
import { buildTemplate, type EmailTemplateKind } from "@/lib/eve/email-templates";
import {
  ensureBuiltinTemplates,
  type EmailVars,
} from "./templates";
import { renderCustomEmail } from "./render";

export type SendEmailInput = {
  to: string;
  templateKey?: string;
  subject?: string;
  text?: string;
  html?: string;
  orderId?: string;
  vars?: EmailVars;
};

export type SendEmailResult = {
  ok: boolean;
  mocked: boolean;
  id?: string;
  to: string;
  subject: string;
  templateKey: string;
  error?: string;
};

const KNOWN_KINDS = ["order_confirmation", "abandoned_cart", "return_update", "general"];

function varsFromInput(input: SendEmailInput): EmailVars {
  return {
    nombre: input.vars?.nombre ?? input.to,
    pedido: input.vars?.pedido ?? input.orderId ?? "",
    total: input.vars?.total,
    link: input.vars?.link,
    estado: input.vars?.estado,
    asunto: input.vars?.asunto ?? input.subject ?? "Mensaje StarShop",
    mensaje: input.vars?.mensaje ?? input.text ?? "Hola, te escribe StarShop.",
    items: input.vars?.items,
    pasos: input.vars?.pasos,
    currency: input.vars?.currency ?? "CLP",
  };
}

/** Render con plantilla de BD; null si no hay plantilla activa. */
async function renderFromDb(
  templateKey: string,
  vars: EmailVars,
  subjectOverride?: string
): Promise<{ subject: string; html: string; text: string; templateId: string } | null> {
  try {
    await ensureBuiltinTemplates();
    const t = await prisma.emailTemplate.findFirst({ where: { key: templateKey, isActive: true } });
    if (!t) return null;
    const rendered = renderCustomEmail(
      {
        subject: subjectOverride ?? t.subject,
        preheader: t.preheader,
        headerTitle: t.headerTitle,
        body: t.body,
        buttonText: t.buttonText,
        buttonUrl: t.buttonUrl,
      },
      vars
    );
    return { ...rendered, templateId: t.id };
  } catch {
    return null;
  }
}

/** Render con las plantillas del código (respaldo sin BD o plantilla inactiva). */
function renderFromCode(
  templateKey: string,
  vars: EmailVars,
  subject?: string,
  text?: string
): { subject: string; html: string; text: string } {
  const kind: EmailTemplateKind = (KNOWN_KINDS as string[]).includes(templateKey)
    ? (templateKey as EmailTemplateKind)
    : "general";
  const built = buildTemplate(kind, {
    subject: subject ?? vars.asunto,
    text: text ?? vars.mensaje,
    orderId: vars.pedido || undefined,
    to: vars.nombre,
  });
  return { subject: subject || built.subject, html: built.html, text: text ?? built.text };
}

async function writeLog(entry: {
  to: string;
  templateId?: string;
  templateKey: string;
  subject: string;
  status: "SENT" | "MOCKED" | "FAILED";
  providerId?: string;
  error?: string;
}) {
  try {
    await prisma.emailLog.create({ data: entry });
  } catch {
    // El log nunca rompe el envío.
  }
}

export async function sendTransactionalEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const templateKey = input.templateKey ?? "general";
  const vars = varsFromInput(input);

  const fromDb = await renderFromDb(templateKey, vars, input.subject);
  const fromCode = fromDb ? null : renderFromCode(templateKey, vars, input.subject, input.text);
  const subject = fromDb?.subject ?? fromCode?.subject ?? input.subject ?? "Mensaje StarShop";
  const bodyHtml = input.html ?? fromDb?.html ?? fromCode?.html ?? "";
  const bodyText = input.text ?? fromDb?.text ?? fromCode?.text ?? "";

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "StarShop <noreply@starshop.cl>";

  if (!apiKey) {
    console.log(`[Email MOCK] to=${input.to} subject="${subject}" template=${templateKey}`);
    await writeLog({
      to: input.to,
      templateId: fromDb?.templateId,
      templateKey,
      subject,
      status: "MOCKED",
    });
    return {
      ok: true,
      mocked: true,
      to: input.to,
      subject,
      templateKey,
    };
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject,
        html: bodyHtml,
        text: bodyText,
        tags: [
          { name: "template", value: templateKey },
          ...(input.orderId ? [{ name: "orderId", value: input.orderId }] : []),
        ],
      }),
      signal: AbortSignal.timeout(10000),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      await writeLog({ to: input.to, templateId: fromDb?.templateId, templateKey, subject, status: "FAILED", error: j?.message ?? `HTTP ${r.status}` });
      return { ok: false, mocked: false, to: input.to, subject, templateKey, error: j?.message ?? `HTTP ${r.status}` };
    }
    await writeLog({ to: input.to, templateId: fromDb?.templateId, templateKey, subject, status: "SENT", providerId: j.id });
    return { ok: true, mocked: false, id: j.id, to: input.to, subject, templateKey };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await writeLog({ to: input.to, templateId: fromDb?.templateId, templateKey, subject, status: "FAILED", error });
    return { ok: false, mocked: false, to: input.to, subject, templateKey, error };
  }
}
