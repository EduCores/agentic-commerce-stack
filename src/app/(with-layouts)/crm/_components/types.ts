export type CrmData = {
  leads: { id: string; name: string; email: string; deals: number; revenue: number; performance: string }[];
  growth: { week: string; leads: number }[];
  tasks: { id: string; title: string; due: string; type: string }[];
  recentActivities: { id: string; text: string; at: string; kind: string }[];
  totals: { customers: number };
};
