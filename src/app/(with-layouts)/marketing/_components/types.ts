export type MarketingData = {
  /** true = datos reales de la DB; false = demo/mock. */
  live: boolean;
  channels: { channel: string; spend: number; clicks: number; convRate: number; revenue: number; isLive?: boolean }[];
  funnel: { stage: string; value: number }[];
  campaigns: { id: string; name: string; provider: string; active: boolean; products: number; orders: number; revenue: number }[];
  totals: { impressions: number; revenue: number };
  audience: { customers: number; byChannel: { channel: string; customers: number }[] };
};
