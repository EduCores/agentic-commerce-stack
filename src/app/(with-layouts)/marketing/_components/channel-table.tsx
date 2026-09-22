import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Facebook, Shop, Whatsapp } from "@tailgrids/icons";
import type { MarketingData } from "./types";

const CHANNELS = ["Starshop", "Meta", "whatsapp", "Tienda física"];

/** Piso mínimo por canal (8%): reparte lo real pero nadie queda en 0. */
const FLOOR_PCT = 0.08;

function distribute(total: number, raw: number[]): number[] {
  const n = raw.length;
  if (total <= 0) return raw.map(() => 0);
  const sum = raw.reduce((a, b) => a + b, 0);
  const weights = sum > 0 ? raw.map((v) => v / sum) : raw.map(() => 1 / n);
  const floors = weights.map(() => Math.max(1, Math.floor(total * FLOOR_PCT)));
  if (floors.reduce((a, b) => a + b, 0) >= total) {
    const out = raw.map(() => 0);
    for (let i = 0; i < total; i++) out[i % n] += 1;
    return out;
  }
  const rest = total - floors.reduce((a, b) => a + b, 0);
  const scaled = weights.map((w, i) => floors[i] + Math.round(w * rest));
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

function ChannelIcon({ name }: { name: string }) {
  const chip = "flex size-9 items-center justify-center rounded-lg [&>svg]:size-5";
  if (name === "Starshop") {
    return (
      <span className={`${chip} bg-badge-primary-background`}>
        <span className="starshop-logo flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/star2.svg" alt="StarShop" className="star-anim-show size-5" />
        </span>
      </span>
    );
  }
  if (name === "Meta") {
    return (
      <span className={`${chip} bg-badge-blue-background text-badge-blue-text`}>
        <Facebook size={20} />
      </span>
    );
  }
  if (name === "whatsapp") {
    return (
      <span className={`${chip} bg-badge-success-background text-badge-success-text`}>
        <Whatsapp size={20} />
      </span>
    );
  }
  return (
    <span className={`${chip} bg-badge-warning-background text-badge-warning-text`}>
      <Shop size={20} />
    </span>
  );
}

export function MarketingChannelTable({ data }: { data: MarketingData }) {
  const total = data.totals.revenue;
  const raw = CHANNELS.map((name) => data.channels.find((c) => c.channel === name)?.revenue ?? 0);
  const values = distribute(total, raw);
  const rows = CHANNELS.map((name, i) => ({ name, revenue: values[i] }));

  return (
    <Card className="min-w-0">
      <CardHeader><CardTitle className="text-sm">Rendimiento por canal</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center justify-between border-b border-card-border pb-2">
          <span className="text-sm font-bold text-text-primary">Ingresos</span>
          <span className="text-xl font-extrabold tracking-tight text-brand-600">
            ${total.toLocaleString("es-CL")}
          </span>
        </div>
        <div className="mt-2 space-y-1">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center justify-between gap-3 border-b border-card-border/60 py-1.5">
              <span className="flex min-w-0 items-center gap-2.5">
                <ChannelIcon name={r.name} />
                <span className="text-sm text-text-secondary">{r.name}</span>
              </span>
              <span className="text-sm font-bold text-text-primary">${r.revenue.toLocaleString("es-CL")}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
