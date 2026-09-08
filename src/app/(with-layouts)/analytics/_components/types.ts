export type AnalyticsData = {
  salesByDay: { date: string; total: number; orders: number }[];
  byStatus: { status: string; count: number }[];
  bySource: { source: string; count: number }[];
  topContent: { title: string; sku: string; views: number; uniques: number }[];
  lowStock: { title: string; sku: string; stock: number }[];
  totals: { orders: number; revenue: number };
};
