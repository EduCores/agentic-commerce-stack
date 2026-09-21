"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/utils/cn";
import { Badge } from "@/components/tailgrids/core/badge";
import type { FlowNodeData } from "../types";
import { NODE_LABEL_ES, NODE_STATUS_ES, NODE_TYPE_ES, INTENT_LABEL_ES } from "../types";

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

export function BaseNode({ data, selected }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  return (
    <div
      className={cn(
        "min-w-64 rounded-xl border bg-card-background px-4 py-3 shadow-sm transition",
        selected ? "border-brand-500 shadow-md" : "border-card-border",
        statusRing[d.status ?? "idle"]
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-brand-500" />
        <span className="text-sm font-semibold text-text-primary">{NODE_LABEL_ES[d.label] ?? d.label}</span>
        {d.status && d.status !== "idle" && (
          <Badge color={statusColor[d.status] ?? "gray"} className="ml-auto">
            {NODE_STATUS_ES[d.status] ?? d.status}
          </Badge>
        )}
      </div>
      {d.description && <p className="mt-1.5 text-xs leading-4 text-text-tertiary line-clamp-2">{d.description}</p>}
      {d.agent && <p className="mt-1.5 text-[11px] font-medium text-brand-600 truncate">🤖 {d.agent}</p>}
      {d.tools && d.tools.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {d.tools.slice(0, 3).map((t) => (
            <Badge key={t} color="gray" className="text-[10px]">
              {t}
            </Badge>
          ))}
          {d.tools.length > 3 && <span className="text-[10px] text-text-tertiary">+{d.tools.length - 3}</span>}
        </div>
      )}
      {d.intent && <p className="mt-1 text-[10px] uppercase tracking-widest text-brand-500">{INTENT_LABEL_ES[d.intent] ?? d.intent}</p>}
      {(d.prompt || d.model) && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {d.prompt && (
            <Badge color="primary" className="text-[10px]">
              prompt propio
            </Badge>
          )}
          {d.model && <Badge color="gray" className="text-[10px]">{d.model.split("/").pop()}</Badge>}
        </div>
      )}
      {!d.agent && d.type && <p className="mt-1 text-[10px] uppercase tracking-widest text-text-tertiary">{NODE_TYPE_ES[d.type] ?? d.type}</p>}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  );
}
