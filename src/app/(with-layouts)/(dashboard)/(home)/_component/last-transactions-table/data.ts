import { BadgeColor, Transaction } from "./types";

export const SKELETON_ROW_COUNT = 5;

export const transactionsTableData: Transaction[] = [
  {
    id: "#ORD-2958",
    date: "26 dic 2026",
    time: "12:45",
    customer: "Javiera Paredes",
    amount: "$189.990",
    status: "Enviado",
    statusColor: "violet",
  },
  {
    id: "#ORD-8539",
    date: "26 dic 2026",
    time: "23:00",
    customer: "Matías Soto",
    amount: "$99.990",
    status: "Entregado",
    statusColor: "success",
  },
  {
    id: "#ORD-1047",
    date: "26 dic 2026",
    time: "16:57",
    customer: "Camila Rojas",
    amount: "$459.990",
    status: "Entregado",
    statusColor: "success",
  },
  {
    id: "#ORD-6392",
    date: "26 dic 2026",
    time: "14:14",
    customer: "Diego Fuentes",
    amount: "$129.990",
    status: "Pendiente",
    statusColor: "warning",
  },
  {
    id: "#ORD-4715",
    date: "26 dic 2026",
    time: "07:00",
    customer: "Fernanda Lagos",
    amount: "$349.990",
    status: "Devuelto",
    statusColor: "gray",
  },
];

export const STATUS_LABEL_MAP: Record<string, string> = {
  shipped: "Enviado",
  delivered: "Entregado",
  pending: "Pendiente",
  returned: "Devuelto",
  failed: "Fallido",
  refunded: "Reembolsado",
  processing: "Procesando",
};

export const STATUS_COLOR_MAP: Record<string, BadgeColor> = {
  shipped: "violet",
  delivered: "success",
  pending: "warning",
  returned: "gray",
  failed: "error",
  refunded: "orange",
  processing: "blue",
};
