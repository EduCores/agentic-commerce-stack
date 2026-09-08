export type MarketingData = {
  channels: { channel: string; spend: number; clicks: number; convRate: number; revenue: number }[];
  funnel: { stage: string; value: number }[];
  campaigns: { id: string; name: string; active: boolean; products: number; orders: number }[];
  totals: { impressions: number; revenue: number };
};
