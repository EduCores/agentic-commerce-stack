"use client";

import Link from "next/link";
import { ShoppingCart, Wallet } from "lucide-react";
import { formatCLP } from "./home-types";

type Props = {
  orders: number;
  revenue: number;
  alerts: number;
};

/** Los 2 números que mandan: pedidos totales e ingresos, bien destacados. */
export function StatHero({ orders, revenue, alerts }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 to-primary-500 p-6 text-white">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-white/20 [&>svg]:size-5">
            <ShoppingCart />
          </span>
          <p className="text-sm font-medium text-white/90">Pedidos totales</p>
        </div>
        <p className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">{orders.toLocaleString("es-CL")}</p>
        <Link href="/orders" className="mt-2 inline-block text-xs font-medium text-white/90 underline">
          Ver pedidos →
        </Link>
      </div>
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-amber-300 to-brand-500 p-6 text-amber-950">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-black/10 [&>svg]:size-5">
              <Wallet />
            </span>
            <p className="text-sm font-medium">Ingresos</p>
          </div>
          {alerts > 0 && (
            <Link
              href="/orders?status=FAILED"
              className="rounded-lg bg-black/10 px-2 py-1 text-xs font-bold underline"
            >
              ⚠️ {alerts} con alerta
            </Link>
          )}
        </div>
        <p className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">{formatCLP(revenue)}</p>
        <Link href="/analytics" className="mt-2 inline-block text-xs font-medium underline">
          Ver analítica →
        </Link>
      </div>
    </div>
  );
}
