export type CrmData = {
  leads: { id: string; name: string; email: string; deals: number; revenue: number; performance: string }[];
  growth: { day: string; leads: number; revenue: number }[];
  tasks: { id: string; title: string; due: string; type: string }[];
  recentActivities: { id: string; text: string; at: string; kind: string }[];
  totals: { customers: number; revenue: number; avgTicket: number };
};

export const CRM_RANGES = [7, 14, 21, 28] as const;
export type CrmRange = (typeof CRM_RANGES)[number];
