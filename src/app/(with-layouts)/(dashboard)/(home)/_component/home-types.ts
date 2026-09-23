/** Tipos compartidos del home (Panel del dueño). */

export type HomeStats = {
  counts: {
    products: number;
    orders: number;
    customers: number;
    agents: number;
    workflows: number;
    agentRuns: number;
    workflowRuns: number;
  };
  stock: { total: number; reserved: number; availability: number };
  revenue: number;
  salesByDay: { date: string; total: number }[];
  topProducts: { product: { title: string; sku: string; price?: string | number | null } | null; quantity: number }[];
  recentOrders: {
    id: string;
    total: unknown;
    status: string;
    customer: { name: string | null } | null;
  }[];
  recentProducts: { sku: string; title: string; stock: number }[];
};

export const SALES_RANGES = [7, 14, 21, 28] as const;
export type SalesRange = (typeof SALES_RANGES)[number];

export function formatCLP(n: number): string {
  return Number(n).toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

/** Estados de pedido en español (los badges nunca muestran el código en inglés). */
export const ORDER_STATUS_ES: Record<string, string> = {
  PENDING: "Pendiente",
  RESERVED: "Reservado",
  PAID: "Pagado",
  FULFILLED: "Completado",
  CANCELLED: "Cancelado",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
};
