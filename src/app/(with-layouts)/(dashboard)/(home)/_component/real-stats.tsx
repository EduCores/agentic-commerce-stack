"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/tailgrids/core/card";
import { StatHero } from "./stat-hero";
import { StatCards } from "./stat-cards";
import { SalesCard } from "./sales-card";
import { SiteSummaries } from "./site-summaries";
import { TopProducts } from "./top-products";
import { RecentOrders } from "./recent-orders";
import type { HomeStats, SalesRange } from "./home-types";

/** Home: lo más relevante del ACS — héroe, tarjetas vivas, ventas y resúmenes. */
export function RealStats() {
  const [days, setDays] = useState<SalesRange>(7);
  const { data, isLoading } = useQuery<HomeStats>({
    queryKey: ["dashboard-stats", days],
    queryFn: async () => {
      const r = await fetch(`/api/dashboard/stats?days=${days}`);
      if (!r.ok) throw new Error("No se pudieron cargar las métricas");
      return r.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Cargando tus métricas reales...</CardContent></Card>;
  if (!data) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Sin datos por ahora</CardContent></Card>;
  const alerts = data.recentOrders.filter((o) => o.status === "FAILED" || o.status === "PENDING").length;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="md:col-span-4">
        <StatHero orders={data.counts.orders} revenue={data.revenue} alerts={alerts} />
      </div>
      <div className="md:col-span-4">
        <StatCards stats={data} />
      </div>
      <div className="md:col-span-4">
        <SalesCard sales={data.salesByDay} days={days} onDays={setDays} />
      </div>
      <div className="md:col-span-4">
        <SiteSummaries />
      </div>
      <div className="md:col-span-2">
        <TopProducts items={data.topProducts} />
      </div>
      <div className="md:col-span-2">
        <RecentOrders orders={data.recentOrders} />
      </div>
    </div>
  );
}
