import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";

/**
 * Agent Mail Tool — ACS
 * Envía emails transaccionales (confirmación, carrito abandonado, devolución).
 * En dev/log mode sin RESEND_API_KEY solo loguea y devuelve ok mock (no bloquea flujo).
 * En prod con RESEND_API_KEY usa Resend API (https://resend.com).
 */
export default defineTool({
  description:
    "Envía un email transaccional al cliente (confirmación de pedido, carrito abandonado, devolución). Usa el email del Customer o el provisto. En dev sin API key, hace mock log.",
  inputSchema: z.object({
    to: z.string().email().describe("Email destinatario"),
    subject: z.string().min(3).describe("Asunto del email"),
    html: z.string().optional().describe("Cuerpo HTML (si no se provee, se genera desde text)"),
    text: z.string().optional().describe("Cuerpo texto plano alternativo"),
    orderId: z.string().optional().describe("ID de pedido relacionado (para tracking)"),
    template: z.enum(["order_confirmation", "abandoned_cart", "return_update", "general"]).default("general"),
  }),
  async execute({ to, subject, html, text, orderId, template }) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM ?? "StarShop <noreply@starshop.cl>";
    const bodyHtml = html ?? `<p>${(text ?? subject).replace(/\n/g, "<br/>")}</p>`;
    const bodyText = text ?? html?.replace(/<[^>]+>/g, " ") ?? subject;

    // Mock mode: sin API key, no falla — loguea
    if (!apiKey) {
      console.log(`[AgentMail MOCK] to=${to} subject="${subject}" template=${template} orderId=${orderId ?? "-"}`);
      console.log(`[AgentMail MOCK] html snippet: ${bodyHtml.slice(0, 200)}`);
      return {
        ok: true,
        mocked: true,
        to,
        subject,
        template,
        orderId: orderId ?? null,
        message: "Email mockeado (sin RESEND_API_KEY). En prod configura RESEND_API_KEY y EMAIL_FROM.",
      };
    }

    // Prod: Resend API
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html: bodyHtml,
          text: bodyText,
          tags: [
            { name: "template", value: template },
            ...(orderId ? [{ name: "orderId", value: orderId }] : []),
          ],
        }),
        signal: AbortSignal.timeout(10000),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        console.warn("[AgentMail] Resend HTTP", r.status, j);
        return { ok: false, error: j?.message ?? `HTTP ${r.status}`, to, subject, template };
      }
      return { ok: true, mocked: false, id: j.id, to, subject, template, orderId: orderId ?? null };
    } catch (e) {
      console.warn("[AgentMail] error", e instanceof Error ? e.message : e);
      return { ok: false, error: e instanceof Error ? e.message : String(e), to, subject, template, mocked: false };
    }
  },
});
