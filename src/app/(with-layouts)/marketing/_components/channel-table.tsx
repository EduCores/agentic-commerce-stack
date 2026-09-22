import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import type { MarketingData } from "./types";

const KNOWN_CHANNELS = ["Starshop", "Meta", "whatsapp", "Tienda física"];

export function MarketingChannelTable({ data }: { data: MarketingData }) {
  const total = data.totals.revenue;
  const rows = KNOWN_CHANNELS.map((name) => ({
    name,
    revenue: data.channels.find((c) => c.channel === name)?.revenue ?? 0,
  }));
  const extra = data.channels.filter((c) => !KNOWN_CHANNELS.includes(c.channel));

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
          {extra.map((c) => (
            <div key={c.channel} className="flex items-center justify-between border-b border-card-border/60 py-1.5 text-sm">
              <span className="text-text-secondary">{c.channel}</span>
              <span className="text-text-primary">${c.revenue.toLocaleString("es-CL")}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}