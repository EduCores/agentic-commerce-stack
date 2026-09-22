/** Render de una plantilla (BD o formulario) con {{variables}}. */
import { emailShell } from "@/lib/eve/email-templates";
import { renderVarsHtml, renderVarsText, type EmailVars } from "./templates";

export type EmailFields = {
  subject: string;
  preheader?: string | null;
  headerTitle: string;
  body: string;
  buttonText?: string | null;
  buttonUrl?: string | null;
};

export function renderCustomEmail(fields: EmailFields, vars: EmailVars) {
  const subject = renderVarsText(fields.subject, vars);
  const bodyHtml = renderVarsHtml(fields.body, vars);
  const link = renderVarsText(fields.buttonUrl ?? "", vars) || "#";
  const cta = fields.buttonText
    ? `<p style="margin:20px 0 6px"><a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#FFD814 0%,#FFB800 100%);color:#111111;padding:13px 28px;border-radius:4px;font-weight:800;font-size:15px;text-decoration:none;box-shadow:0 4px 14px rgba(255,184,0,.35)">${fields.buttonText}</a></p>`
    : "";
  const html = emailShell(fields.headerTitle, renderVarsText(fields.preheader ?? "", vars), bodyHtml + cta);
  const text = `${subject}\n\n${renderVarsText(fields.body, vars)}`;
  return { subject, html, text };
}

/** Variables de ejemplo para la vista previa del editor. */
export const PREVIEW_VARS: EmailVars = {
  nombre: "María",
  pedido: "DEMO-1001",
  total: "$99.980 CLP",
  link: "/checkout?recover=1",
  estado: "en revisión",
  asunto: "Aviso de StarShop",
  mensaje: "Hola, te escribe el equipo StarShop.",
  items: [
    { title: "Taladro percutor 20V", qty: 2, price: 49990 },
    { title: "Sierra circular 7-1/4", qty: 1, price: 89990 },
  ],
  pasos: ["Recibimos tu solicitud", "Validamos plazo y estado del producto", "Te enviamos etiqueta de devolución"],
  currency: "CLP",
};
