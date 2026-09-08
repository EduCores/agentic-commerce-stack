export type AiStats = {
  totals: { requests: number; cost: number; successRate: number; activeAgents: number };
  byDay: { day: string; requests: number }[];
  table: { id: string; name: string; slug: string; model: string; active: boolean; requests: number; success: number }[];
  providers: { name: string; pct: number }[];
  workflows: { status: string; _count: { status: number } }[];
  recent: { id: string; agent: string; status: string; at: string }[];
};
