type BadgeColor =
  | "gray"
  | "primary"
  | "error"
  | "warning"
  | "success"
  | "cyan"
  | "sky"
  | "blue"
  | "violet"
  | "purple"
  | "pink"
  | "rose"
  | "orange";

export type Transaction = {
  id: string;
  date: string;
  time: string;
  customer: string;
  amount: string;
  status: string;
  statusColor: BadgeColor;
};

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
