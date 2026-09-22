import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";

/**
 * Agent Mail Tool — ACS
 * Envía emails transaccionales (confirmación, carrito abandonado, devolución).
 * Usa la plantilla activa de /admin/emails y deja todo en el historial (EmailLog).
 * En dev/log mode sin RESEND_API_KEY solo loguea y devuelve ok mock (no bloquea flujo).
 * En prod con RESEND_API_KEY usa Resend API (https://resend.com).
 */
export default defineTool({
  description:
    "Envía un email transaccional al cliente (confirmación de pedido, carrito abandonado, devolución). Usa el email del Customer o el provisto. En dev sin API key, hace mock log.",
  inputSchema: z.object({
    to: z.string().email().describe("Email destinatario"),
    subject: z.string().min(3).describe("Asunto del email"),
    html: z.string().optional().describe("Cuerpo HTML (si no se provee, se genera desde la plantilla)"),
    text: z.string().optional().describe("Cuerpo texto plano alternativo"),
    orderId: z.string().optional().describe("ID de pedido relacionado (para tracking)"),
    template: z.enum(["order_confirmation", "abandoned_cart", "return_update", "general"]).default("general"),
  }),
  async execute({ to, subject, html, text, orderId, template }) {
    const { sendTransactionalEmail } = await import("@/lib/emails/send");
    const result = await sendTransactionalEmail({
      to,
      templateKey: template,
      subject,
      text,
      html,
      orderId,
      vars: { nombre: to, pedido: orderId ?? "" },
    });
    if (!result.ok) {
      return { ok: false, error: result.error ?? "No se pudo enviar", to, subject, template };
    }
    if (result.mocked) {
      return {
        ok: true,
        mocked: true,
        to,
        subject: result.subject,
        template,
        orderId: orderId ?? null,
        message: "Email mockeado (sin RESEND_API_KEY). En prod configura RESEND_API_KEY y EMAIL_FROM.",
      };
    }
    return { ok: true, mocked: false, id: result.id, to, subject: result.subject, template, orderId: orderId ?? null };
  },
});
