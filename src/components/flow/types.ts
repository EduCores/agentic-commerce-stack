export type FlowNodeType =
  | "trigger"
  | "reserve_stock"
  | "payment"
  | "fulfill"
  | "agent_decision"
  | "condition"
  | "webhook"
  | "cancel";

export type FlowNodeData = {
  label: string;
  description?: string;
  type: FlowNodeType;
  config?: Record<string, unknown>;
  status?: "pending" | "running" | "completed" | "failed" | "idle";
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
];
