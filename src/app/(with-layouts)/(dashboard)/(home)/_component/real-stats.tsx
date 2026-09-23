"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/tailgrids/core/card";
import { StatHero } from "./stat-hero";
import { SalesCard } from "./sales-card";
import { SiteSummaries } from "./site-summaries";
import { TopProducts } from "./top-products";
import { RecentOrders } from "./recent-orders";
import { HomeFunnelCard } from "./home-funnel-card";
import { HomeChannelsCard } from "./home-channels-card";
import { HomeLowStockCard } from "./home-lowstock-card";
import { HomeOpsCard } from "./home-ops-card";
import type { HomeStats, SalesRange } from "./home-types";

/** Home Hub: lo más relevante del ACS ordenado por valor para el dueño. */
export function RealStats() {
  const [days, setDays] = useState<SalesRange>(7);
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");
  const { data, isLoading } = useQuery<HomeStats>({
    queryKey: ["dashboard-stats", days, month, year],
    queryFn: async () => {
      const params = new URLSearchParams({ days: String(days) });
      if (month !== "all") params.set("month", month);
      if (year !== "all") params.set("year", year);
      const r = await fetch(`/api/dashboard/stats?${params}`);
      if (!r.ok) throw new Error("No se pudieron cargar las métricas");
      return r.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Cargando tu panel en tiempo real...</CardContent></Card>;
  if (!data) return <Card><CardContent className="p-6 text-sm text-text-tertiary">Sin datos por ahora</CardContent></Card>;
  const alerts = data.recentOrders.filter((o) => o.status === "FAILED" || o.status === "PENDING").length;

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-4">
      {/* 1 Hero financiero unificado — lo primero que quiere ver el dueño */}
      <div className="min-w-0 md:col-span-4">
        <StatHero
          orders={data.counts.orders}
          revenue={data.revenue}
          alerts={alerts}
          availability={data.stock.availability}
          stockTotal={data.stock.total}
          reserved={data.stock.reserved}
        />
      </div>

      {/* 2 Ventas — tendencia clara, selector moderno */}
      <div className="min-w-0 md:col-span-4">
        <SalesCard sales={data.salesByDay} days={days} onDays={setDays} month={month} year={year} onMonth={setMonth} onYear={setYear} />
      </div>

      {/* 3 Operativa comercial — embudo, canales y stock comparten la fila clave */}
      <div className="grid min-w-0 gap-4 md:col-span-4 md:grid-cols-3">
        <HomeFunnelCard />
        <HomeChannelsCard />
        <HomeLowStockCard />
      </div>

      {/* 4 Inteligencia y automatización — AI, marketing y carritos */}
      <div className="min-w-0 md:col-span-4">
        <SiteSummaries />
      </div>

      {/* 5 Detalle de oferta y demanda */}
      <div className="min-w-0 md:col-span-2">
        <TopProducts items={data.topProducts} />
      </div>
      <div className="min-w-0 md:col-span-2">
        <RecentOrders orders={data.recentOrders} />
      </div>

      {/* 6 Operación diaria — tareas y actividad */}
      <div className="min-w-0 md:col-span-4">
        <HomeOpsCard />
      </div>
    </div>
  );
}
