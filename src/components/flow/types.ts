import { STARSHOP_INTENTS } from "@/../prisma/starshop-prompts";

export type FlowNodeType =
  | "trigger"
  | "reserve_stock"
  | "payment"
  | "fulfill"
  | "agent_decision"
  | "condition"
  | "webhook"
  | "cancel"
  | "email_send"
  | "whatsapp_send";

export type FlowNodeData = {
  label: string;
  description?: string;
  detail?: string; // texto largo para tooltip/drawer
  type: FlowNodeType;
  config?: Record<string, unknown>;
  status?: "pending" | "running" | "completed" | "failed" | "idle";
  agent?: string;
  tools?: string[];
  intent?: string;
  model?: string;
  /** Gira 180° el icono dentro de los conectores (solo visual). */
  handleIconFlip?: boolean;
  prompt?: string; // system prompt del crew — si está vacío se usa el del código (fallback)
};

export type FlowGraph = {
  nodes: Array<{ id: string; type?: string; position: { x: number; y: number }; data: FlowNodeData }>;
  edges: Array<{ id: string; source: string; target: string; label?: string }>;
};

export const NODE_PALETTE: Array<{ type: FlowNodeType; label: string; description: string; color: string }> = [
  { type: "trigger", label: "Disparador", description: "Pedido creado / Webhook / Manual", color: "bg-violet-500" },
  { type: "reserve_stock", label: "Reservar stock", description: "Reserva stock en la tienda", color: "bg-blue-500" },
  { type: "payment", label: "Procesar pago", description: "Stripe / MercadoPago", color: "bg-emerald-500" },
  { type: "fulfill", label: "Despachar pedido", description: "Marca el pedido como enviado", color: "bg-orange-500" },
  { type: "agent_decision", label: "Decisión del agente", description: "EVE decide el siguiente paso", color: "bg-pink-500" },
  { type: "condition", label: "Condición", description: "Si / No (Si-Entonces)", color: "bg-amber-500" },
  { type: "webhook", label: "Webhook", description: "Llama a una API externa", color: "bg-cyan-500" },
  { type: "cancel", label: "Cancelar", description: "Cancela y libera el stock", color: "bg-red-500" },
  { type: "email_send", label: "Enviar email", description: "Gmail/SMTP — conector real Fase 2", color: "bg-indigo-500" },
  { type: "whatsapp_send", label: "Enviar WhatsApp", description: "WhatsApp — conector real Fase 2", color: "bg-green-500" },
];

/** Traducción display de los intents (identificadores técnicos intactos en los datos). */
export const INTENT_LABEL_ES: Record<string, string> = {
  product_search: "Búsqueda de productos",
  price_comparison: "Comparación de precios",
  checkout_support: "Ayuda de compra",
  general_inquiry: "Consultas generales",
  abandoned_cart: "Carrito abandonado",
  return_request: "Solicitud de devolución",
  order_tracking: "Seguimiento de pedido",
  escalate_human: "Derivar a humano",
  admin_ops: "Operaciones admin",
};

/** Traducción display de estados de nodo (identificadores intactos en los datos). */
export const NODE_STATUS_ES: Record<string, string> = {
  pending: "En espera",
  running: "En ejecución",
  completed: "Completado",
  failed: "Fallido",
  idle: "Inactivo",
};

/** Traducción display de etiquetas almacenadas (de grafos sembrados en inglés). */
export const NODE_LABEL_ES: Record<string, string> = {
  "1 Welcome And Detect Intent": "1 Bienvenida y detección de intento",
  "2 Route By Intent": "2 Enrutar por intento",
  "3 Checkout Guide": "3 Guía de compra",
  "3 Compare Prices Crew": "3 Comparador de precios",
  "3 General Support": "3 Soporte general",
  "3 Search And Recommend": "3 Búsqueda y recomendación",
  "3 Handle Return Request": "3 Gestión de devoluciones",
  "3 Recover Abandoned Cart": "3 Recuperar carrito",
  "3 Order Tracking (WISMO)": "3 Seguimiento de pedido (WISMO)",
  "3 Validate Stock & Pricing": "3 Validar stock y precio",
  "3 Escalate To Human": "3 Derivar a humano",
  "3 Admin Ops (Dueño)": "3 Operaciones admin (Dueño)",
  "4 Confirm Order": "4 Confirmar pedido",
  "Email Event Trigger": "1 Evento de email",
  "Validate Recipient": "2 Validar destinatario",
  "Render Template": "3 Renderizar plantilla",
  "Send Email": "4 Enviar email",
};

/** Traducción display de tipos de nodo (identificadores intactos en los datos). */
export const NODE_TYPE_ES: Record<string, string> = {
  trigger: "Disparador",
  reserve_stock: "Reservar stock",
  payment: "Pago",
  fulfill: "Despacho",
  agent_decision: "Decisión IA",
  condition: "Condición",
  webhook: "Webhook",
  cancel: "Cancelación",
  email_send: "Email",
  whatsapp_send: "WhatsApp",
};

/**
 * Lista de intents que el editor ofrece para los nodos crew.
 * Fuente única de verdad: prisma/starshop-prompts.ts (misma que valida crew-graph.ts).
 */
export const FLOW_INTENTS = STARSHOP_INTENTS;

/**
 * Modelos aceptados por el runtime (allowlist de agent/index.ts).
 * Si se agrega un modelo aquí sin agregarlo allá, el agente IGNORA el override
 * y sigue usando el modelo del código (comportamiento seguro, no rompe el chat).
 *
 * ORDEN IMPORTANTE: primero los PAGADOS (fiabilidad garantizada). Los :free de
 * OpenRouter tienen tope DIARIO por cuenta; agotados devuelven 429 y el agente
 * cae a heurística. "Add 10 credits" sube la cuota free a 100 req/día.
 * No se ofrecen en el selector los IDs que hoy devuelven 404/402.
 */
export const FLOW_MODELS: Array<{ id: string; label: string }> = [
  { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B (rápido, fiable)" },
  { id: "qwen/qwen3-30b-a3b-instruct-2507", label: "Qwen3 30B (rápido, barato)" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B (fiable)" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini (muy fiable)" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (rápido)" },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "Nemotron 3 Ultra (gratis $0, cuota diaria)" },
  { id: "nvidia/nemotron-3.5-lightning:free", label: "Nemotron 3.5 Lightning (gratis $0)" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super 120B (gratis $0)" },
  { id: "qwen/qwen3.8-27b:free", label: "Qwen3.8 27B (gratis $0, pruebas)" },
];

/**
 * Tools reales registradas en agent/index.ts (ALL_TOOL_DEFS).
 * Igual que con los modelos: un nombre que no exista se filtra y no se aplica.
 */
export const FLOW_TOOLS = [
  "searchProducts",
  "checkStock",
  "calculatePricing",
  "navigateTo",
  "checkout",
  "processPurchase",
  "scrapeWebsite",
  "sendEmail",
  "orderTracking",
  "cancelOrder",
  "getSalesSummary",
] as const;

/** crew-graph.ts solo aplica prompts de más de 40 caracteres. */
export const FLOW_MIN_PROMPT_LENGTH = 41;
