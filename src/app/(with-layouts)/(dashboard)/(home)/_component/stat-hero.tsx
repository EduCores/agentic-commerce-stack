"use client";

import Link from "next/link";
import { ShoppingCart, Wallet } from "lucide-react";
import { formatCLP } from "./home-types";

type Props = {
  orders: number;
  revenue: number;
  alerts: number;
};

/** Hero financiero: pedidos e ingresos con iconos grandes a la derecha, foco total. */
export function StatHero({ orders, revenue, alerts }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex items-center justify-between gap-4 overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 to-primary-500 p-6 text-white">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/85">Pedidos totales</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight md:text-5xl">{orders.toLocaleString("es-CL")}</p>
          <div className="mt-3 flex items-center gap-2">
            <Link href="/orders" className="text-xs font-bold text-white/90 underline hover:text-white">
              Ver pedidos →
            </Link>
            {alerts > 0 && (
              <Link href="/orders?status=FAILED" className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold backdrop-blur hover:bg-white/20">
                ⚠️ {alerts} con alerta
              </Link>
            )}
          </div>
        </div>
        <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur [&>svg]:size-9">
          <ShoppingCart />
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 overflow-hidden rounded-xl bg-gradient-to-br from-amber-300 via-brand-500 to-amber-400 p-6 text-amber-950">
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-900/80">Ingresos totales</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight md:text-5xl">{formatCLP(revenue)}</p>
          <Link href="/analytics" className="mt-3 inline-block text-xs font-bold text-amber-900/80 underline hover:text-amber-950">
            Ver analítica →
          </Link>
        </div>
        <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-black/10 backdrop-blur [&>svg]:size-9">
          <Wallet />
        </span>
      </div>
    </div>
  );
}
