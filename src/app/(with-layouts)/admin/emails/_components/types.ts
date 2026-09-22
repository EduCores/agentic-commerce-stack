/** Contratos de datos del estudio de correos (/admin/emails). */

export type EmailTemplateDTO = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  subject: string;
  preheader: string | null;
  headerTitle: string;
  body: string;
  buttonText: string | null;
  buttonUrl: string | null;
  isActive: boolean;
  builtin: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SequenceStepDTO = {
  waitHours: number;
  templateKey: string;
  subject?: string;
};

export type EmailSequenceDTO = {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  isActive: boolean;
  steps: SequenceStepDTO[];
  createdAt: string;
  updatedAt: string;
  _count?: { enrollments: number };
};

export type CartItemDTO = { title: string; qty: number; price: number };

export type CartDTO = {
  id: string;
  cartKey: string | null;
  email: string;
  customerName: string | null;
  items: CartItemDTO[];
  total: number;
  currency: string;
  recoverUrl: string | null;
  status: "OPEN" | "RECOVERED" | "EXPIRED";
  lastActivityAt: string;
  createdAt: string;
};

export type LogDTO = {
  id: string;
  to: string;
  templateId: string | null;
  templateKey: string | null;
  subject: string;
  status: "SENT" | "MOCKED" | "FAILED";
  providerId: string | null;
  error: string | null;
  createdAt: string;
  template: { name: string; key: string } | null;
};

/** Formulario del editor de plantillas. */
export type TemplateForm = {
  name: string;
  description: string;
  subject: string;
  preheader: string;
  headerTitle: string;
  body: string;
  buttonText: string;
  buttonUrl: string;
  isActive: boolean;
};

export const EMPTY_TEMPLATE_FORM: TemplateForm = {
  name: "",
  description: "",
  subject: "",
  preheader: "",
  headerTitle: "",
  body: "",
  buttonText: "",
  buttonUrl: "",
  isActive: true,
};

export function templateToForm(t: EmailTemplateDTO): TemplateForm {
  return {
    name: t.name,
    description: t.description ?? "",
    subject: t.subject,
    preheader: t.preheader ?? "",
    headerTitle: t.headerTitle,
    body: t.body,
    buttonText: t.buttonText ?? "",
    buttonUrl: t.buttonUrl ?? "",
    isActive: t.isActive,
  };
}

/** Variables con nombre simple para el editor. */
export const VARIABLE_HELP: { key: string; label: string }[] = [
  { key: "nombre", label: "Nombre del cliente" },
  { key: "pedido", label: "Número de pedido" },
  { key: "productos", label: "Tabla de productos" },
  { key: "total", label: "Total del pedido" },
  { key: "link", label: "Enlace (retomar compra)" },
  { key: "estado", label: "Estado (devolución)" },
  { key: "pasos", label: "Lista de pasos" },
  { key: "asunto", label: "Asunto (mensaje libre)" },
  { key: "mensaje", label: "Mensaje (plantilla libre)" },
];
