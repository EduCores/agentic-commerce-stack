/**
 * ACS Email Templates en BD — nombres amigables + variables {{...}}.
 * Las 4 plantillas del sistema se crean solas (sin pisar ediciones del dueño).
 */
import { prisma } from "@/lib/adapters/prisma";

export type EmailItem = { title: string; qty: number; price: number };

export type EmailVars = {
  nombre?: string;
  pedido?: string;
  total?: string;
  link?: string;
  estado?: string;
  asunto?: string;
  mensaje?: string;
  items?: EmailItem[];
  pasos?: string[];
  currency?: string;
};

/** Variables disponibles en el editor, con etiqueta simple y ejemplo. */
export const EMAIL_VARIABLES: { key: string; label: string; example: string }[] = [
  { key: "nombre", label: "Nombre del cliente", example: "María" },
  { key: "pedido", label: "Número de pedido", example: "DEMO-1001" },
  { key: "productos", label: "Tabla de productos", example: "(se genera sola)" },
  { key: "total", label: "Total del pedido", example: "$99.980 CLP" },
  { key: "link", label: "Enlace (retomar compra)", example: "(se genera solo)" },
  { key: "estado", label: "Estado (devolución)", example: "en revisión" },
  { key: "pasos", label: "Lista de pasos", example: "(se genera sola)" },
  { key: "asunto", label: "Asunto (mensaje libre)", example: "Tu código StarShop" },
  { key: "mensaje", label: "Mensaje (plantilla libre)", example: "Hola, te escribe…" },
];

export const BUILTIN_TEMPLATE_KEYS = [
  "order_confirmation",
  "abandoned_cart",
  "return_update",
  "general",
] as const;

export type BuiltinTemplateKey = (typeof BUILTIN_TEMPLATE_KEYS)[number];

type BuiltinDef = {
  key: string;
  name: string;
  description: string;
  subject: string;
  preheader: string;
  headerTitle: string;
  body: string;
  buttonText: string | null;
  buttonUrl: string | null;
};

/** Contenido inicial de las 4 plantillas del sistema (nombres fáciles). */
export const BUILTIN_TEMPLATES: BuiltinDef[] = [
  {
    key: "order_confirmation",
    name: "Pedido confirmado",
    description: "Se envía al confirmar un pedido, con el resumen de la compra.",
    subject: "Pedido {{pedido}} confirmado — StarShop",
    preheader: "Tu pedido {{pedido}} está confirmado",
    headerTitle: "Pedido confirmado",
    body: "Hola {{nombre}},\n\nTu pedido {{pedido}} está confirmado.\n\n{{productos}}\n\nTotal: {{total}}\n\nTe avisaremos cuando salga a despacho.",
    buttonText: "Ver mi pedido",
    buttonUrl: "/orders",
  },
  {
    key: "abandoned_cart",
    name: "Carrito abandonado",
    description: "Recupera ventas: se envía cuando un carro queda sin comprar.",
    subject: "Dejaste productos en tu carro — retómalo en 1 clic",
    preheader: "Guardamos tu carro, retómalo aquí",
    headerTitle: "Carro guardado",
    body: "Hola {{nombre}},\n\nGuardamos tu carro:\n\n{{productos}}\n\n¿Necesitas ayuda con stock o despacho? Responde este correo.",
    buttonText: "Retomar compra",
    buttonUrl: "{{link}}",
  },
  {
    key: "return_update",
    name: "Devolución de pedido",
    description: "Informa el estado de una devolución y sus pasos.",
    subject: "Devolución pedido {{pedido}}: {{estado}}",
    preheader: "Tu devolución: {{estado}}",
    headerTitle: "Devolución",
    body: "Hola {{nombre}},\n\nTu devolución del pedido {{pedido}} está: {{estado}}.\n\n{{pasos}}\n\nSi está aprobada, el reembolso tarda 3-5 días hábiles.",
    buttonText: null,
    buttonUrl: null,
  },
  {
    key: "general",
    name: "Mensaje general",
    description: "Mensaje libre del equipo o del agente (avisos, códigos).",
    subject: "{{asunto}}",
    preheader: "{{asunto}}",
    headerTitle: "Mensaje StarShop",
    body: "{{mensaje}}",
    buttonText: null,
    buttonUrl: null,
  },
];

/** Crea las plantillas del sistema que falten. Nunca pisa ediciones existentes. */
export async function ensureBuiltinTemplates() {
  try {
    const existing = await prisma.emailTemplate.findMany({ select: { key: true } });
    const have = new Set(existing.map((e) => e.key));
    for (const b of BUILTIN_TEMPLATES) {
      if (!have.has(b.key)) {
        await prisma.emailTemplate.create({ data: { ...b } });
      }
    }
  } catch {
    // Sin BD no se bloquea: el envío usa las plantillas del código.
  }
}

/** Pasos por defecto de la secuencia "Recuperar carrito". */
export const DEFAULT_ABANDONED_SEQUENCE = {
  name: "Recuperar carrito abandonado",
  description: "1er recordatorio a la hora, 2do con urgencia a las 24 horas.",
  trigger: "ABANDONED_CART",
  steps: [
    { waitHours: 1, templateKey: "abandoned_cart" },
    { waitHours: 24, templateKey: "abandoned_cart", subject: "Último aviso: tu carro sigue guardado" },
  ],
};

/** Crea la secuencia de carrito abandonado si no existe ninguna activa. */
export async function ensureDefaultSequence() {
  try {
    const existing = await prisma.emailSequence.findFirst({
      where: { trigger: "ABANDONED_CART", isActive: true },
    });
    if (!existing) {
      await prisma.emailSequence.create({ data: { ...DEFAULT_ABANDONED_SEQUENCE } });
    }
  } catch {
    // Sin BD no se bloquea.
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function itemsTable(items: EmailItem[], currency: string): string {
  const rows = items
    .map(
      (it) =>
        `<tr><td style="padding:6px 0">${escapeHtml(it.title)} × ${it.qty}</td>` +
        `<td style="padding:6px 0;text-align:right">$${(it.price * it.qty).toLocaleString("es-CL")} ${currency}</td></tr>`
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0">${rows}</table>`;
}

/** Reemplaza {{variables}} en un texto. {{productos}} y {{pasos}} generan HTML. */
export function renderVarsHtml(text: string, vars: EmailVars): string {
  const currency = vars.currency ?? "CLP";
  let out = text;
  const scalar: Record<string, string | undefined> = {
    nombre: vars.nombre ?? "Cliente",
    pedido: vars.pedido ?? "",
    total: vars.total ?? "",
    link: vars.link ?? "",
    estado: vars.estado ?? "",
    asunto: vars.asunto ?? "",
    mensaje: vars.mensaje ?? "",
  };
  for (const [k, v] of Object.entries(scalar)) {
    out = out.split(`{{${k}}}`).join(escapeHtml(v ?? ""));
  }
  out = out
    .split("{{productos}}")
    .join(vars.items && vars.items.length > 0 ? itemsTable(vars.items, currency) : "");
  out = out
    .split("{{pasos}}")
    .join(
      vars.pasos && vars.pasos.length > 0
        ? `<ol>${vars.pasos.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ol>`
        : ""
    );
  // Limpia variables desconocidas y convierte saltos de línea.
  out = out.replace(/\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g, "");
  return out.split("\n").join("<br/>");
}

/** Versión texto plano del cuerpo (para el envío y el log). */
export function renderVarsText(text: string, vars: EmailVars): string {
  let out = text;
  const scalar: Record<string, string | undefined> = {
    nombre: vars.nombre ?? "Cliente",
    pedido: vars.pedido ?? "",
    total: vars.total ?? "",
    link: vars.link ?? "",
    estado: vars.estado ?? "",
    asunto: vars.asunto ?? "",
    mensaje: vars.mensaje ?? "",
  };
  for (const [k, v] of Object.entries(scalar)) {
    out = out.split(`{{${k}}}`).join(v ?? "");
  }
  out = out
    .split("{{productos}}")
    .join(
      vars.items && vars.items.length > 0
        ? vars.items.map((it) => `${it.title} × ${it.qty}`).join(", ")
        : ""
    );
  out = out.split("{{pasos}}").join(vars.pasos && vars.pasos.length > 0 ? vars.pasos.join(" → ") : "");
  return out.replace(/\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g, "");
}
