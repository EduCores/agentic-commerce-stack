export type AnalyticsData = {
  salesByDay: { date: string; total: number; orders: number }[];
  byStatus: { status: string; count: number; revenue: number }[];
  bySource: { source: string; count: number; revenue: number }[];
  topContent: { title: string; sku: string; views: number; uniques: number }[];
  lowStock: { title: string; sku: string; stock: number }[];
  totals: { orders: number; revenue: number };
};

export const ANALYTICS_RANGES = [7, 14, 21, 28] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];
