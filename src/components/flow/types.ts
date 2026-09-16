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
  prompt?: string; // system prompt del crew — si está vacío se usa el del código (fallback)
};

export type FlowGraph = {
  nodes: Array<{ id: string; type?: string; position: { x: number; y: number }; data: FlowNodeData }>;
  edges: Array<{ id: string; source: string; target: string; label?: string }>;
};

export const NODE_PALETTE: Array<{ type: FlowNodeType; label: string; description: string; color: string }> = [
  { type: "trigger", label: "Trigger", description: "Order created / Webhook / Manual", color: "bg-violet-500" },
  { type: "reserve_stock", label: "Reserve Stock", description: "Reserva stock en tienda", color: "bg-blue-500" },
  { type: "payment", label: "Process Payment", description: "Stripe / MercadoPago", color: "bg-emerald-500" },
  { type: "fulfill", label: "Fulfill Order", description: "Marca como enviado", color: "bg-orange-500" },
  { type: "agent_decision", label: "Agent Decision", description: "EVE decide siguiente paso", color: "bg-pink-500" },
  { type: "condition", label: "Condition", description: "If / Else", color: "bg-amber-500" },
  { type: "webhook", label: "Webhook", description: "Llama API externa", color: "bg-cyan-500" },
  { type: "cancel", label: "Cancel", description: "Cancela y libera stock", color: "bg-red-500" },
  { type: "email_send", label: "Email (Gmail/SMTP)", description: "Envía email — conector real Fase 2", color: "bg-indigo-500" },
  { type: "whatsapp_send", label: "WhatsApp", description: "Envía WhatsApp — conector real Fase 2", color: "bg-green-500" },
];

/**
 * Lista de intents que el editor ofrece para los nodos crew.
 * Fuente única de verdad: prisma/starshop-prompts.ts (misma que valida crew-graph.ts).
 */
export const FLOW_INTENTS = STARSHOP_INTENTS;

/**
 * Modelos aceptados por el runtime (allowlist de agent/index.ts).
 * Si se agrega un modelo aquí sin agregarlo allá, el agente IGNORA el override
 * y sigue usando el modelo del código (comportamiento seguro, no rompe el chat).
 */
export const FLOW_MODELS: Array<{ id: string; label: string }> = [
  { id: "qwen/qwen3-30b-a3b-instruct-2507", label: "Qwen3 30B A3B Instruct (estable, barato)" },
  { id: "openai/gpt-4o", label: "GPT-4o (mejor calidad, más caro)" },
  { id: "google/gemini-2-0-flash-001", label: "Gemini 2.0 Flash (rápido)" },
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
] as const;

/** crew-graph.ts solo aplica prompts de más de 40 caracteres. */
export const FLOW_MIN_PROMPT_LENGTH = 41;
