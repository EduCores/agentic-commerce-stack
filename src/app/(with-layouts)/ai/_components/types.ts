export type AiStats = {
  totals: { requests: number; cost: number; successRate: number; activeAgents: number };
  byDay: { day: string; requests: number }[];
  table: { id: string; name: string; slug: string; model: string; active: boolean; requests: number; success: number }[];
  providers: { name: string; pct: number }[];
  workflows: { status: string; _count: { status: number } }[];
  recent: { id: string; agent: string; status: string; at: string }[];
};

export const AI_RANGES = [7, 14, 21, 28] as const;
export type AiRange = (typeof AI_RANGES)[number];

/** Estados de ejecución del agente en español. */
export const AGENT_STATUS_ES: Record<string, string> = {
  PENDING: "Pendiente",
  RUNNING: "En curso",
  COMPLETED: "Completado",
  FAILED: "Fallido",
  CANCELLED: "Cancelado",
};
