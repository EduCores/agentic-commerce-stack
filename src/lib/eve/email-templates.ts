/**
 * ACS Email Templates — mock sin RESEND_API_KEY, prod con Resend.
 * Fuente única para tool send-email + preview visual /admin/emails.
 */

export type EmailTemplateKind = "order_confirmation" | "abandoned_cart" | "return_update" | "general";

export type EmailBuilt = { subject: string; html: string; text: string };

type Item = { title: string; qty: number; price: number };

const BRAND = "#FFD814";
const INK = "#111111";
const MUTED = "#6b7280";

function shell(title: string, preheader: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:12px;overflow:hidden" class="dark-invert">`
    + `<div style="background:${BRAND};padding:16px 20px;font-weight:bold;color:${INK};font-size:16px">${title}</div>`
    + `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>`
    + `<div style="padding:20px;color:${INK};font-size:14px;line-height:1.6">${body}</div>`
    + `<div style="padding:12px 20px;font-size:12px;color:${MUTED};border-top:1px solid #eee">StarShop · B2B Chile · ventas@starshop.cl</div>`
    + `</div>`
    + `<style>@media (prefers-color-scheme: dark) { .dark-invert { background:#111!important; color:#fafafa!important; border-color:#333!important; } .dark-invert .muted { color:#999!important; } }</style>`;
}

function rows(items: Item[], currency: string): string {
  return items.map((it) => `<tr><td style="padding:6px 0">${it.title} × ${it.qty}</td><td style="padding:6px 0;text-align:right">$${(it.price * it.qty).toLocaleString("es-CL")} ${currency}</td></tr>`).join("");
}

export function buildOrderConfirmation(opts: { orderId: string; customerName?: string; items?: Item[]; total?: number; currency?: string }): EmailBuilt {
  const items = opts.items ?? [{ title: "Taladro percutor 20V", qty: 2, price: 49990 }];
  const currency = opts.currency ?? "CLP";
  const total = opts.total ?? items.reduce((a, it) => a + it.price * it.qty, 0);
  const name = opts.customerName ?? "Cliente";
  const subject = `Pedido ${opts.orderId} confirmado — StarShop`;
  const body = `<p>Hola ${name},</p><p>Tu pedido <b>${opts.orderId}</b> está confirmado.</p>`
    + `<table style="width:100%;border-collapse:collapse;margin:12px 0">${rows(items, currency)}</table>`
    + `<p><b>Total: $${total.toLocaleString("es-CL")} ${currency}</b></p>`
    + `<p>Te avisaremos cuando salga a despacho. Seguimiento en /orders.</p>`;
  return { subject, html: shell("Pedido confirmado", `Pedido ${opts.orderId}`, body), text: `Hola ${name}, tu pedido ${opts.orderId} confirmado. Total $${total} ${currency}.` };
}

export function buildAbandonedCart(opts: { customerName?: string; items?: Item[]; recoverUrl?: string; currency?: string }): EmailBuilt {
  const items = opts.items ?? [{ title: "Sierra circular 7-1/4", qty: 1, price: 89990 }];
  const currency = opts.currency ?? "CLP";
  const name = opts.customerName ?? "Cliente";
  const url = opts.recoverUrl ?? "/checkout?recover=1";
  const subject = `Dejaste productos en tu carro — retómalo en 1 clic`;
  const body = `<p>Hola ${name},</p><p>Guardamos tu carro:</p>`
    + `<table style="width:100%;border-collapse:collapse;margin:12px 0">${rows(items, currency)}</table>`
    + `<p><a href="${url}" style="display:inline-block;background:${BRAND};color:${INK};padding:10px 18px;border-radius:999px;font-weight:bold;text-decoration:none">Retomar compra</a></p>`
    + `<p>¿Necesitas ayuda con stock o despacho? Responde este correo.</p>`;
  return { subject, html: shell("Carro guardado", "Retoma tu compra", body), text: `Hola ${name}, dejaste ${items.length} producto(s) en tu carro. Retómalo: ${url}` };
}

export function buildReturnUpdate(opts: { customerName?: string; orderId?: string; status?: string; steps?: string[] }): EmailBuilt {
  const name = opts.customerName ?? "Cliente";
  const orderId = opts.orderId ?? "DEMO-1001";
  const status = opts.status ?? "en revisión";
  const steps = opts.steps ?? ["Recibimos tu solicitud", "Validamos plazo y estado del producto", "Te enviamos etiqueta de devolución"];
  const subject = `Devolución pedido ${orderId}: ${status}`;
  const body = `<p>Hola ${name},</p><p>Tu devolución del pedido <b>${orderId}</b> está: <b>${status}</b>.</p>`
    + `<ol>${steps.map((s) => `<li>${s}</li>`).join("")}</ol>`
    + `<p>Si está aprobada, el reembolso tarda 3-5 días hábiles.</p>`;
  return { subject, html: shell("Devolución", `Pedido ${orderId}`, body), text: `Hola ${name}, devolución ${orderId}: ${status}. Pasos: ${steps.join(" → ")}` };
}

export function buildGeneral(opts: { title?: string; body?: string; to?: string }): EmailBuilt {
  const title = opts.title ?? "Mensaje StarShop";
  const bodyText = opts.body ?? "Gracias por tu contacto. Te ayudamos con catálogo, stock y despacho.";
  return { subject: title, html: shell(title, title, `<p>${bodyText.replace(/\n/g, "<br/>")}</p>`), text: `${title}\n\n${bodyText}` };
}

export function buildTemplate(kind: EmailTemplateKind, opts: { subject?: string; text?: string; orderId?: string; to?: string }): EmailBuilt {
  if (kind === "order_confirmation") return buildOrderConfirmation({ orderId: opts.orderId ?? "DEMO-1001", customerName: opts.to ?? "Cliente" });
  if (kind === "abandoned_cart") return buildAbandonedCart({ customerName: opts.to ?? "Cliente" });
  if (kind === "return_update") return buildReturnUpdate({ orderId: opts.orderId ?? "DEMO-1001", customerName: opts.to ?? "Cliente" });
  return buildGeneral({ title: opts.subject ?? "Mensaje StarShop", body: opts.text ?? "Hola, te escribe StarShop." });
}

export const EMAIL_TEMPLATE_KINDS: EmailTemplateKind[] = ["order_confirmation", "abandoned_cart", "return_update", "general"];
