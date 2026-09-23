"use client";

import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import { cn } from "@/utils/cn";

const CREW_INTENTS = new Set([
  "product_search",
  "price_comparison",
  "checkout_support",
  "general_inquiry",
  "abandoned_cart",
  "return_request",
  "order_tracking",
  "escalate_human",
]);

function pillFor(toneKey?: string): string {
  if (toneKey === "admin_ops")
    return "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-600 dark:bg-amber-950/60 dark:text-amber-200";
  if (toneKey && CREW_INTENTS.has(toneKey))
    return "border-violet-400 bg-violet-50 text-violet-800 dark:border-violet-500 dark:bg-violet-950/60 dark:text-violet-200";
  if (toneKey)
    return "border-sky-400 bg-sky-50 text-sky-800 dark:border-sky-500 dark:bg-sky-950/60 dark:text-sky-200";
  return "border-gray-300 bg-card-background text-text-secondary dark:border-gray-600";
}

export type LabeledEdgeData = {
  label?: string;
  toneKey?: string;
};

/**
 * Arista con etiqueta HTML propia (pastilla de color según crew/paso).
 * La etiqueta va en el punto medio, truncada, para no tapar nodos.
 */
export function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
  data,
}: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const d = (data ?? {}) as LabeledEdgeData;
  const label = typeof d.label === "string" ? d.label : "";

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={selected ? { stroke: "#5750F1", strokeWidth: 2.5 } : undefined}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="absolute"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            <span
              title={label}
              className={cn(
                "block max-w-[190px] truncate rounded-full border-4 px-3 py-1 text-center text-xs font-bold shadow-md",
                pillFor(d.toneKey)
              )}
            >
              {label}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
