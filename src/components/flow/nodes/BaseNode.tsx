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

const statusColor: Record<string, "success" | "warning" | "error" | "gray"> = {
  completed: "success",
  running: "warning",
  failed: "error",
  pending: "gray",
};

type Accent = {
  bar: string;
  chip: string;
  icon: LucideIcon;
  /** Borde + icono del conector con el color del nodo. */
  handle: string;
};

/** Nodos IA (crews): barra degradada violeta + icono por intent. */
const INTENT_STYLE: Record<string, Accent> = {
  product_search: { bar: "bg-gradient-to-r from-violet-500 to-indigo-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: Search, handle: "!border-violet-500 text-violet-600 dark:text-violet-400" },
  price_comparison: { bar: "bg-gradient-to-r from-violet-500 to-indigo-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: Tag, handle: "!border-violet-500 text-violet-600 dark:text-violet-400" },
  checkout_support: { bar: "bg-gradient-to-r from-violet-500 to-indigo-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: ShoppingCart, handle: "!border-violet-500 text-violet-600 dark:text-violet-400" },
  general_inquiry: { bar: "bg-gradient-to-r from-violet-500 to-indigo-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: HelpCircle, handle: "!border-violet-500 text-violet-600 dark:text-violet-400" },
  abandoned_cart: { bar: "bg-gradient-to-r from-violet-500 to-indigo-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: ShoppingBag, handle: "!border-violet-500 text-violet-600 dark:text-violet-400" },
  return_request: { bar: "bg-gradient-to-r from-violet-500 to-indigo-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: RotateCcw, handle: "!border-violet-500 text-violet-600 dark:text-violet-400" },
  order_tracking: { bar: "bg-gradient-to-r from-violet-500 to-indigo-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: PackageCheck, handle: "!border-violet-500 text-violet-600 dark:text-violet-400" },
  escalate_human: { bar: "bg-gradient-to-r from-violet-500 to-indigo-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: Headphones, handle: "!border-violet-500 text-violet-600 dark:text-violet-400" },
  admin_ops: { bar: "bg-gradient-to-r from-amber-400 to-orange-500", chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", icon: Crown, handle: "!border-amber-500 text-amber-600 dark:text-amber-400" },
};

/** Nodos de proceso: barra sólida por tipo + icono. */
const TYPE_STYLE: Record<string, Accent> = {
  trigger: { bar: "bg-violet-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: Zap, handle: "!border-violet-500 text-violet-600 dark:text-violet-400" },
  reserve_stock: { bar: "bg-blue-500", chip: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: Package, handle: "!border-blue-500 text-blue-600 dark:text-blue-400" },
  payment: { bar: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CreditCard, handle: "!border-emerald-500 text-emerald-600 dark:text-emerald-400" },
  fulfill: { bar: "bg-orange-500", chip: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", icon: Truck, handle: "!border-orange-500 text-orange-600 dark:text-orange-400" },
  agent_decision: { bar: "bg-pink-500", chip: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300", icon: Bot, handle: "!border-pink-500 text-pink-600 dark:text-pink-400" },
  condition: { bar: "bg-amber-500", chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", icon: Split, handle: "!border-amber-500 text-amber-600 dark:text-amber-400" },
  webhook: { bar: "bg-cyan-500", chip: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300", icon: Globe, handle: "!border-cyan-500 text-cyan-600 dark:text-cyan-400" },
  cancel: { bar: "bg-red-500", chip: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300", icon: XCircle, handle: "!border-red-500 text-red-600 dark:text-red-400" },
  email_send: { bar: "bg-indigo-500", chip: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300", icon: Mail, handle: "!border-indigo-500 text-indigo-600 dark:text-indigo-400" },
  whatsapp_send: { bar: "bg-green-500", chip: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", icon: MessageCircle, handle: "!border-green-500 text-green-600 dark:text-green-400" },
};

const FALLBACK: Accent = {
  bar: "bg-gradient-to-r from-violet-500 to-indigo-500",
  chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  icon: Bot,
  handle: "!border-violet-500 text-violet-600 dark:text-violet-400",
};

/**
 * Tarjeta de nodo con TODA la info original (título, estado, descripción,
 * agente, tools, intent, tipo, prompt, modelo) en ALTURA FIJA (h-[216px]):
 * coincide con NODE_H del auto-layout para que las filas nunca se solapen.
 * Los conectores toman el color del nodo y su icono.
 */
export function BaseNode({ data, selected }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  const accent = (d.intent && INTENT_STYLE[d.intent]) || (d.type && TYPE_STYLE[d.type]) || FALLBACK;
  const Icon = accent.icon;
  const title = NODE_LABEL_ES[d.label] ?? d.label;
  const status = d.status ?? "idle";
  const visibleTools = (d.tools ?? []).slice(0, 2);
  const hiddenTools = Math.max(0, (d.tools ?? []).length - visibleTools.length);

  return (
    <div
      className={cn(
        "h-[224px] w-56 overflow-hidden rounded-xl border bg-card-background shadow-sm transition",
        selected ? "shadow-md ring-2 ring-brand-500" : "border-card-border",
        statusRing[status]
      )}
      title={title}
    >
      <div className={cn("h-1.5 w-full", accent.bar)} aria-hidden="true" />
      <div className="flex h-[calc(100%-6px)] flex-col px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4", accent.chip)}>
            <Icon />
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-text-primary">{title}</span>
          {d.status && d.status !== "idle" && (
            <Badge color={statusColor[d.status] ?? "gray"} className="shrink-0 text-[10px]">
              {NODE_STATUS_ES[d.status] ?? d.status}
            </Badge>
          )}
        </div>

        {d.description ? (
          <p className="mt-1 line-clamp-4 text-xs leading-4 text-text-tertiary">{d.description}</p>
        ) : (
          <p className="mt-1 truncate text-xs text-text-tertiary">
            {(d.intent && (INTENT_LABEL_ES[d.intent] ?? d.intent)) || ""}
          </p>
        )}

        {d.agent && (
          <p className="mt-1 flex items-center gap-1 truncate text-[11px] font-medium text-brand-600">
            <Bot className="size-3.5 shrink-0" />
            <span className="truncate">{d.agent}</span>
          </p>
        )}

        {d.tools && d.tools.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1 overflow-hidden">
            <Wrench className="size-3 shrink-0 text-text-tertiary" />
            {visibleTools.map((t) => (
              <Badge key={t} color="primary" className="shrink-0 text-[10px]">
                {t}
              </Badge>
            ))}
            {hiddenTools > 0 && <span className="shrink-0 text-[10px] text-text-tertiary">+{hiddenTools}</span>}
          </div>
        )}

        <div className="mt-auto pt-1.5">
          {d.intent && (
            <p className="truncate text-[10px] uppercase tracking-widest text-brand-500" title={INTENT_LABEL_ES[d.intent] ?? d.intent}>
              {INTENT_LABEL_ES[d.intent] ?? d.intent}
            </p>
          )}
          <div className="mt-1 flex min-w-0 items-center gap-1">
            {d.prompt ? (
              <Badge color="primary" className="shrink-0 text-[10px]">
                prompt propio
              </Badge>
            ) : null}
            {d.model ? (
              <Badge color="success" className="min-w-0 flex-1 truncate text-[10px]" title={d.model}>
                {displayModelName(d.model)}
              </Badge>
            ) : !d.agent && d.type ? (
              <p className="truncate text-[10px] uppercase tracking-widest text-text-tertiary">
                {NODE_TYPE_ES[d.type] ?? d.type}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        title="Entrada"
        aria-label="Entrada"
        className={cn("flex !h-7 !w-7 items-center justify-center !rounded-full !border-2 !bg-white !shadow-md dark:!bg-zinc-900 [&>svg]:size-4", accent.handle)}
      >
        <Icon />
      </Handle>
      <Handle
        type="source"
        position={Position.Bottom}
        title="Salida — arrastra para conectar"
        aria-label="Salida — arrastra para conectar"
        className={cn("flex !h-7 !w-7 items-center justify-center !rounded-full !border-2 !bg-white !shadow-md dark:!bg-zinc-900 [&>svg]:size-4", accent.handle)}
      >
        <Icon />
      </Handle>
    </div>
  );
}
