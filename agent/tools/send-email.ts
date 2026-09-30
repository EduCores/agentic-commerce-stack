import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";

/** Buzones de la propia tienda: siempre permitidos como destinatario. */
const STORE_ADDRESSES = ["ventas@starshop.cl", "soporte@starshop.cl", "contacto@starshop.cl"];

/** Tope de envíos del AGENTE por minuto (ventana fija, best-effort por instancia). */
const MAX_PER_MIN = 12;
const WINDOW_MS = 60_000;
let bucket = { count: 0, resetAt: 0 };

function rateLimited(): boolean {
  const now = Date.now();
  if (bucket.resetAt <= now) {
    bucket = { count: 1, resetAt: now + WINDOW_MS };
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_PER_MIN;
}

/** "StarShop <noreply@starshop.cl>" → "noreply@starshop.cl" */
function addressOf(value: string | undefined): string {
  if (!value) return "";
  const m = value.match(/<([^>]+)>/);
  return (m ? m[1] : value).trim().toLowerCase();
}

/** Buzones propios + extras declarados en STARSHOP_EMAIL_ALLOWLIST (coma-separados). */
function storeRecipients(): Set<string> {
  const extra = (process.env.STARSHOP_EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((s) => addressOf(s))
    .filter(Boolean);
  return new Set(
    [...STORE_ADDRESSES, addressOf(process.env.EMAIL_FROM), addressOf(process.env.STARSHOP_NOTIFY_EMAIL), ...extra].filter(Boolean),
  );
}

/**
 * Puerta anti-relay: el agente solo escribe a la tienda o a clientes que existen en
 * el catálogo (Customer.email). Sin esto, cualquier visitante podía pedir por chat
 * "manda este correo a <víctima>" y usar nuestro dominio verificado como relay de
 * spam/phishing. Fail-closed: si no se puede verificar el destinatario, no se envía.
 */
async function recipientAllowed(to: string): Promise<boolean> {
  const norm = addressOf(to);
  if (!norm) return false;
  if (storeRecipients().has(norm)) return true;
  try {
    const { prisma } = await import("@/lib/adapters/prisma");
    const customer = await prisma.customer.findFirst({
      where: { email: { equals: norm, mode: "insensitive" } },
      select: { id: true },
    });
    return !!customer;
  } catch {
    return false;
  }
}

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
    to: z.string().email().describe("Email destinatario (solo la tienda o un cliente registrado)"),
    subject: z.string().min(3).describe("Asunto del email"),
    html: z.string().optional().describe("Cuerpo HTML (si no se provee, se genera desde la plantilla)"),
    text: z.string().optional().describe("Cuerpo texto plano alternativo"),
    orderId: z.string().optional().describe("ID de pedido relacionado (para tracking)"),
    template: z.enum(["order_confirmation", "abandoned_cart", "return_update", "general"]).default("general"),
  }),
  async execute({ to, subject, html, text, orderId, template }) {
    if (rateLimited()) {
      return {
        ok: false,
        to,
        subject,
        template,
        error: "Límite temporal de envíos alcanzado",
        hint: "Demasiados correos en el último minuto. Indica al usuario que intente en un momento o que escriba a ventas@starshop.cl.",
      };
    }
    if (!(await recipientAllowed(to))) {
      return {
        ok: false,
        to,
        subject,
        template,
        error: "Destinatario no permitido",
        hint: "Solo se envía a la tienda (ventas@starshop.cl) o a clientes registrados en un pedido. Para terceros, invita a escribir a ventas@starshop.cl.",
      };
    }
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
