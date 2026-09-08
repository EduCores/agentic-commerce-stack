export function formatDate(isoString: string): { date: string; time: string } {
  const d = new Date(isoString);
  const date = d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { date, time };
}

export function formatAmount(value: number, currency: string): string {
  if (value === 0) return `$0`;
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
