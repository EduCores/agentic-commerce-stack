"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/utils/cn";
import { Badge } from "@/components/tailgrids/core/badge";
import { displayModelName } from "@/utils/model-display";
import type { FlowNodeData } from "../types";
import { NODE_LABEL_ES, NODE_STATUS_ES, NODE_TYPE_ES, INTENT_LABEL_ES } from "../types";
import {
  Bot,
  CreditCard,
  Crown,
  Globe,
  Headphones,
  HelpCircle,
  Mail,
  MessageCircle,
  Package,
  PackageCheck,
  RotateCcw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Split,
  Tag,
  Truck,
  Wrench,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";

const statusRing: Record<string, string> = {
  running: "ring-2 ring-amber-400 animate-pulse",
  completed: "ring-2 ring-emerald-400",
  failed: "ring-2 ring-red-500",
  pending: "ring-1 ring-gray-300",
  idle: "",
};

const statusDot: Record<string, string> = {
  running: "bg-amber-400 animate-pulse",
  completed: "bg-emerald-500",
  failed: "bg-red-500",
  pending: "bg-gray-300",
  idle: "bg-gray-200",
};

type Accent = { bar: string; chip: string; icon: LucideIcon };

/** Nodos IA (crews): barra degradada violeta + icono por intent. */
const INTENT_STYLE: Record<string, Accent> = {
  product_search: { bar: "bg-gradient-to-r from-violet-500 to-indigo-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: Search },
  price_comparison: { bar: "bg-gradient-to-r from-violet-500 to-indigo-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: Tag },
  checkout_support: { bar: "bg-gradient-to-r from-violet-500 to-indigo-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: ShoppingCart },
  general_inquiry: { bar: "bg-gradient-to-r from-violet-500 to-indigo-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: HelpCircle },
  abandoned_cart: { bar: "bg-gradient-to-r from-violet-500 to-indigo-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: ShoppingBag },
  return_request: { bar: "bg-gradient-to-r from-violet-500 to-indigo-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: RotateCcw },
  order_tracking: { bar: "bg-gradient-to-r from-violet-500 to-indigo-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: PackageCheck },
  escalate_human: { bar: "bg-gradient-to-r from-violet-500 to-indigo-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: Headphones },
  admin_ops: { bar: "bg-gradient-to-r from-amber-400 to-orange-500", chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", icon: Crown },
};

/** Nodos de proceso: barra sólida por tipo + icono. */
const TYPE_STYLE: Record<string, Accent> = {
  trigger: { bar: "bg-violet-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: Zap },
  reserve_stock: { bar: "bg-blue-500", chip: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: Package },
  payment: { bar: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CreditCard },
  fulfill: { bar: "bg-orange-500", chip: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", icon: Truck },
  agent_decision: { bar: "bg-pink-500", chip: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300", icon: Bot },
  condition: { bar: "bg-amber-500", chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", icon: Split },
  webhook: { bar: "bg-cyan-500", chip: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300", icon: Globe },
  cancel: { bar: "bg-red-500", chip: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
  email_send: { bar: "bg-indigo-500", chip: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300", icon: Mail },
  whatsapp_send: { bar: "bg-green-500", chip: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", icon: MessageCircle },
};

const FALLBACK: Accent = {
  bar: "bg-gradient-to-r from-violet-500 to-indigo-500",
  chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  icon: Bot,
};

/**
 * Tarjeta de nodo compacta de ALTURA FIJA (h-[164px]): coincide con NODE_H del
 * auto-layout para que las filas nunca se solapen. El contenido variable
 * (descripción, tools, modelo) va truncado dentro de esa caja.
 */
export function BaseNode({ data, selected }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  const accent = (d.intent && INTENT_STYLE[d.intent]) || (d.type && TYPE_STYLE[d.type]) || FALLBACK;
  const Icon = accent.icon;
  const title = NODE_LABEL_ES[d.label] ?? d.label;
  const sub = (d.intent && INTENT_LABEL_ES[d.intent]) || d.description || (d.type ? (NODE_TYPE_ES[d.type] ?? d.type) : "");
  const status = d.status ?? "idle";

  return (
    <div
      className={cn(
        "h-[164px] w-48 overflow-hidden rounded-xl border bg-card-background shadow-sm transition",
        selected ? "shadow-md ring-2 ring-brand-500" : "border-card-border",
        statusRing[status]
      )}
      title={title}
    >
      <div className={cn("h-1.5 w-full", accent.bar)} aria-hidden="true" />
      <div className="flex h-[calc(100%-6px)] flex-col px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4", accent.chip)}>
            <Icon />
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-text-primary">{title}</span>
          <span
            className={cn("size-2 shrink-0 rounded-full", statusDot[status])}
            title={NODE_STATUS_ES[status] ?? status}
            aria-label={NODE_STATUS_ES[status] ?? status}
          />
        </div>

        {sub ? (
          <p className="mt-1 truncate text-xs text-text-tertiary" title={typeof sub === "string" ? sub : undefined}>{sub}</p>
        ) : (
          <p className="mt-1 text-xs text-text-tertiary"> </p>
        )}

        <div className="mt-auto flex min-w-0 items-center justify-between gap-2 pt-2">
          <span className="flex min-w-0 items-center gap-1 text-[11px] font-medium text-text-tertiary">
            {d.agent ? (
              <span className="truncate">🤖 {d.agent}</span>
            ) : d.tools && d.tools.length > 0 ? (
              <>
                <Wrench className="size-3 shrink-0" />
                <span className="truncate">{d.tools.length} tools</span>
              </>
            ) : (
              <span className="truncate">{d.type ? (NODE_TYPE_ES[d.type] ?? d.type) : ""}</span>
            )}
          </span>
          {d.model && (
            <Badge color="success" className="max-w-[86px] shrink-0 truncate text-[10px]" title={d.model}>
              {displayModelName(d.model)}
            </Badge>
          )}
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  );
}
