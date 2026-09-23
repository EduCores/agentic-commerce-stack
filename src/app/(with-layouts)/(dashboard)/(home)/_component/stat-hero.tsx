"use client";

import Link from "next/link";
import { ShoppingCart, Wallet, ReceiptText, PackageCheck, TriangleAlert, LayoutDashboard } from "lucide-react";
import { formatCLP } from "./home-types";

type Props = {
  orders: number;
  revenue: number;
  alerts: number;
  availability: number;
  stockTotal: number;
  reserved: number;
};

/** Hero financiero unificado (mismo lenguaje visual que /ai y /marketing): gradiente + KPIs blancos. */
export function StatHero({ orders, revenue, alerts, availability, stockTotal, reserved }: Props) {
  const ticket = orders > 0 ? Math.round(revenue / orders) : 0;

  return (
    <div className="min-w-0 overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-primary-500 to-[#328e8f] p-6 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-[-0.2px]">
            <span className="flex size-7 items-center justify-center rounded-lg bg-white/15 [&>svg]:size-4">
              <LayoutDashboard />
            </span>
            Resumen financiero — negocio en tiempo real
          </h3>
          <p className="mt-1 text-xs text-white/75">
            {orders.toLocaleString("es-CL")} pedidos · {formatCLP(revenue)} ingresos reales · pedidos pagados y completados
          </p>
        </div>
        <Link href="/orders" className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur hover:bg-white/25">
          Ver /orders →
        </Link>
      </div>

      <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0 rounded-xl bg-white/10 p-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15 [&>svg]:size-4">
              <ShoppingCart />
            </span>
            <p className="min-w-0 truncate text-xs font-medium text-white/80">Pedidos totales</p>
          </div>
          <p className="mt-2 break-words text-2xl font-extrabold tracking-tight">{orders.toLocaleString("es-CL")}</p>
          <p className="text-xs text-white/70">todos los estados del catálogo</p>
        </div>
        <div className="min-w-0 rounded-xl bg-white/10 p-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15 [&>svg]:size-4">
              <Wallet />
            </span>
            <p className="min-w-0 truncate text-xs font-medium text-white/80">Ingresos totales</p>
          </div>
          <p className="mt-2 break-words text-2xl font-extrabold tracking-tight">{formatCLP(revenue)}</p>
          <p className="text-xs text-white/70">pedidos pagados + completados</p>
        </div>
        <div className="min-w-0 rounded-xl bg-white/10 p-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15 [&>svg]:size-4">
              <ReceiptText />
            </span>
            <p className="min-w-0 truncate text-xs font-medium text-white/80">Ticket promedio</p>
          </div>
          <p className="mt-2 break-words text-2xl font-extrabold tracking-tight">{formatCLP(ticket)}</p>
          <p className="text-xs text-white/70">ingresos ÷ pedidos</p>
        </div>
        <div className="min-w-0 rounded-xl bg-white/10 p-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15 [&>svg]:size-4">
              <PackageCheck />
            </span>
            <p className="min-w-0 truncate text-xs font-medium text-white/80">Stock disponible</p>
          </div>
          <p className="mt-2 break-words text-2xl font-extrabold tracking-tight">{availability}%</p>
          <p className="text-xs text-white/70">{stockTotal.toLocaleString("es-CL")} uds · {reserved.toLocaleString("es-CL")} reservadas</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/15 pt-4">
        {alerts > 0 ? (
          <Link
            href="/orders?status=FAILED"
            className="inline-flex items-center gap-1.5 rounded-full bg-red-400/20 px-2.5 py-1 text-xs font-bold text-white backdrop-blur hover:bg-red-400/30"
          >
            <TriangleAlert className="size-3.5" /> {alerts} pedidos requieren atención
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
            <span className="size-1.5 rounded-full bg-emerald-300" /> Sin alertas de pedidos
          </span>
        )}
        <Link href="/analytics" className="ml-auto rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur hover:bg-white/25">
          Ver analítica →
        </Link>
      </div>
    </div>
  );
}