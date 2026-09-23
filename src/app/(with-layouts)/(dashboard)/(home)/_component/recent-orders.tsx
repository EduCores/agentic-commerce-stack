"use client";

import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/tailgrids/core/badge";
import { formatCLP, ORDER_STATUS_ES, type HomeStats } from "./home-types";
import { HomeCardLink } from "./home-card-link";

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "gray"> = {
  PAID: "success",
  FULFILLED: "success",
  PENDING: "warning",
  FAILED: "error",
};

/** Últimos pedidos del home, con enlace a /orders. */
export function RecentOrders({ orders }: { orders: HomeStats["recentOrders"] }) {
  return (
    <div className="min-w-0 rounded-xl border border-card-border bg-card-background p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-badge-violet-background text-badge-violet-text [&>svg]:size-4">
            <ShoppingCart />
          </span>
          <h3 className="min-w-0 truncate text-sm font-semibold tracking-[-0.2px] text-text-primary">Últimos pedidos</h3>
        </div>
        <HomeCardLink href="/orders" size="sm" className="mt-0 w-auto shrink-0">
          Ver todos →
        </HomeCardLink>
      </div>
      <div className="mt-3 space-y-2">
        {orders.length === 0 ? (
          <p className="text-xs text-text-tertiary">Sin pedidos todavía</p>
        ) : (
          orders.slice(0, 5).map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-text-primary">
                {o.customer?.name ?? "—"} <span className="text-xs text-text-tertiary">{String(o.id).slice(0, 8)}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-bold">{formatCLP(Number(o.total))}</span>
                <Badge color={STATUS_COLOR[o.status] ?? "gray"}>{ORDER_STATUS_ES[o.status] ?? o.status}</Badge>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
