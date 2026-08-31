"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/utils/cn";
import type { FlowNodeData } from "../types";

const statusRing: Record<string, string> = {
  running: "ring-2 ring-amber-400 animate-pulse",
  completed: "ring-2 ring-emerald-400",
  failed: "ring-2 ring-red-500",
  pending: "ring-1 ring-gray-300",
  idle: "",
};

export function BaseNode({ data, selected }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  return (
    <div
      className={cn(
        "min-w-56 rounded-xl border bg-card-background px-4 py-3 shadow-sm transition",
        selected ? "border-brand-500 shadow-md" : "border-card-border",
        statusRing[d.status ?? "idle"]
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-brand-500" />
        <span className="text-sm font-semibold text-text-primary">{d.label}</span>
        {d.status && d.status !== "idle" && (
          <span
            className={cn(
              "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              d.status === "completed" && "bg-emerald-100 text-emerald-700",
              d.status === "running" && "bg-amber-100 text-amber-700",
              d.status === "failed" && "bg-red-100 text-red-700",
              d.status === "pending" && "bg-gray-100 text-gray-600"
            )}
          >
            {d.status}
          </span>
        )}
      </div>
      {d.description && <p className="mt-1 text-xs text-text-tertiary">{d.description}</p>}
      {d.type && <p className="mt-1 text-[10px] uppercase tracking-widest text-text-tertiary">{d.type}</p>}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  );
}
