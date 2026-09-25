"use client";

import { useQuery } from "@tanstack/react-query";
import { Share2 } from "lucide-react";
import { Facebook, Whatsapp, Shop } from "@tailgrids/icons";
import { sharePct } from "@/utils/period-stats";
import { HomeCardLink } from "./home-card-link";

type Channel = { channel: string; revenue: number; convRate: number; count?: number };

const CHANNEL_BRAND: Record<string, { color: string }> = {
  Starshop: { color: "#5750F1" },
  Meta: { color: "#1877F2" },
  Whatsapp: { color: "#22C55E" },
  "Tienda física": { color: "#F59E0B" },
};

function ChannelIcon({ name, color }: { name: string; color: string }) {
  const chip = "flex size-8 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4";
  const style = { backgroundColor: `${color}1A`, color };
  if (name === "Starshop") {
    return (
      <span className={chip} style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/star2.svg" alt="StarShop" className="size-4" />
      </span>
    );
  }
  if (name === "Meta") {
    return (
      <span className={chip} style={style}>
        <Facebook size={16} />
      </span>
    );
  }
  if (name === "Whatsapp") {
    return (
      <span className={chip} style={style}>
        <Whatsapp size={16} />
      </span>
    );
  }
  return (
    <span className={chip} style={style}>
      <Shop size={16} />
    </span>
  );
}

export function HomeChannelsCard() {
  const { data } = useQuery<{ channels: Channel[] }>({
    queryKey: ["home-channels"],
    queryFn: async () => (await fetch("/api/marketing")).json(),
    refetchInterval: 60000,
    placeholderData: (prev) => prev,
  });

  const channels = (data?.channels ?? []).slice().sort((a, b) => b.revenue - a.revenue).slice(0, 4);
  const totalRev = channels.reduce((a, c) => a + c.revenue, 0);
  const best = channels[0];

  return (
    <div className="min-w-0 rounded-xl border border-card-border bg-card-background p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-badge-success-background text-badge-success-text [&>svg]:size-4.5">
          <Share2 />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold tracking-[-0.2px] text-text-primary">Canales que más convierten</h3>
          <p className="truncate text-xs text-text-tertiary">Por donde entra el dinero hoy</p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {channels.length === 0 ? (
          <p className="text-xs text-text-tertiary">Sin canales aún.</p>
        ) : (
          channels.map((c) => (
            <div key={c.channel} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-card-border/60 px-3 py-2">
              <span className="flex min-w-0 items-center gap-2.5">
                <ChannelIcon name={c.channel} color={CHANNEL_BRAND[c.channel]?.color ?? "#5750F1"} />
                <span className="min-w-0 truncate text-sm font-medium text-text-primary">{c.channel}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-bold text-brand-600">${c.revenue.toLocaleString("es-CL")}</span>
                <span
                  className="rounded-[4px] px-2 py-0.5 text-xs font-bold"
                  style={{
                    backgroundColor: `${CHANNEL_BRAND[c.channel]?.color ?? "#5750F1"}1A`,
                    color: CHANNEL_BRAND[c.channel]?.color ?? "#5750F1",
                  }}
                >
                  {sharePct(c.revenue, totalRev).toLocaleString("es-CL")}%
                </span>
              </span>
            </div>
          ))
        )}
      </div>
      {best && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
          Mejor canal: <strong>{best.channel}</strong> con {best.convRate}% conversión
        </p>
      )}
      <HomeCardLink href="/marketing">Ver canales →</HomeCardLink>
    </div>
  );
}
