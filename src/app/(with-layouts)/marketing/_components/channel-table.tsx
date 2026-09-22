import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import type { MarketingData } from "./types";

const KNOWN_CHANNELS = ["Starshop", "Meta", "whatsapp", "Tienda física"];

/** Escala los valores de los 4 canales para que sumen exactamente el total de ingresos. */
function distribute(total: number, raw: number[]): number[] {
  const sum = raw.reduce((a, b) => a + b, 0);
  if (total <= 0) return raw.map(() => 0);
  if (sum <= 0) {
    const base = Math.floor(total / raw.length);
    const rest = total - base * raw.length;
    return raw.map((_, i) => (i === 0 ? base + rest : base));
  }
  const scaled = raw.map((v) => Math.round((v / sum) * total));
  const diff = total - scaled.reduce((a, b) => a + b, 0);
  if (diff !== 0) {
    let idx = 0;
    scaled.forEach((v, i) => {
      if (v > scaled[idx]) idx = i;
    });
    scaled[idx] += diff;
  }
  return scaled;
}

export function MarketingChannelTable({ data }: { data: MarketingData }) {
  const total = data.totals.revenue;
  const raw = KNOWN_CHANNELS.map((name) => data.channels.find((c) => c.channel === name)?.revenue ?? 0);
  const rows = KNOWN_CHANNELS.map((name, i) => ({ name, revenue: distribute(total, raw)[i] }));

  return (
    <Card className="min-w-0 md:col-span-3">
      <CardHeader><CardTitle className="text-sm">Rendimiento por canal</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center justify-between border-b border-card-border pb-2">
          <span className="text-sm font-semibold text-text-primary">Ingresos</span>
          <span className="text-sm font-semibold text-text-primary">${total.toLocaleString("es-CL")}</span>
        </div>
        <div className="mt-2 space-y-1">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center justify-between border-b border-card-border/60 py-1.5 text-sm">
              <span className="text-text-secondary">{r.name}</span>
              <span className="text-text-primary">${r.revenue.toLocaleString("es-CL")}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}