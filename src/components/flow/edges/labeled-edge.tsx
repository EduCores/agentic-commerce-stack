"use client";

import { useState } from "react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useViewport, type EdgeProps } from "@xyflow/react";
import { HelpCircle, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { STARSHOP_CREWS, STARSHOP_CREW_TOOLS } from "@/../prisma/starshop-prompts";
import { NODE_PALETTE } from "../types";

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

function infoFor(toneKey?: string): { title: string; what: string; tools: string[] } | null {
  if (!toneKey) return null;
  const crewEntry = Object.entries(STARSHOP_CREWS).find(
    ([intent]) => intent === toneKey
  ) as [string, { name: string; description: string }] | undefined;
  if (crewEntry) {
    const [, crew] = crewEntry;
    return {
      title: crew.name,
      what: crew.description,
      tools: STARSHOP_CREW_TOOLS[toneKey as keyof typeof STARSHOP_CREW_TOOLS] ?? [],
    };
  }
  const step = NODE_PALETTE.find((p) => p.type === toneKey);
  if (step) {
    return { title: step.label, what: step.description, tools: [] };
  }
  return null;
}

export type LabeledEdgeData = {
  label?: string;
  toneKey?: string;
};

/**
 * Carril determinista por edge (-1, 0, +1): los edges paralelos de un fan-out
 * (route-1 → 7 crews) comparten la franja del punto medio; sin carriles las
 * pastillas se solapan en fila. El offset vertical las escalona sobre el cable.
 */
function laneOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 3) - 1;
}

const LANE_DY = 30;

/**
 * Arista con pastilla grande clicable (?): explica qué hace y para qué sirve
 * el crew/paso destino. Solo informativa: no cambia la ejecución.
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
  const [open, setOpen] = useState(false);
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
  const info = infoFor(d.toneKey);
  const laneDy = laneOf(id) * LANE_DY;
  // Con zoom alejado las pastillas completas se solaparían: se colapsan al ?.
  // Umbral 0.7: a ese zoom los nodos están a ~207px y la pastilla mide 200px.
  const { zoom } = useViewport();
  const expanded = zoom >= 0.7;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={selected ? { stroke: "#5750F1", strokeWidth: 2.5 } : { strokeWidth: 2 }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY + laneDy}px)`,
              pointerEvents: "all",
            }}
          >
            {expanded ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((v) => !v);
                }}
                title={info ? `${label} — clic para ver qué hace` : label}
                className={cn(
                  "flex max-w-[160px] items-center gap-1.5 rounded border-4 px-3 py-1.5 shadow-md",
                  "text-xs font-bold",
                  pillFor(d.toneKey)
                )}
              >
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <HelpCircle className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((v) => !v);
                }}
                title={info ? `${label} — clic para ver qué hace` : label}
                aria-label={info ? `${label} — ver qué hace` : label}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border-2 shadow-md",
                  pillFor(d.toneKey)
                )}
              >
                <HelpCircle className="size-4 shrink-0" aria-hidden="true" />
              </button>
            )}
            {open && info && (
              <div
                className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-xl border border-card-border bg-card-background p-3 text-left shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-text-primary">{info.title}</p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Cerrar ayuda"
                    className="rounded p-0.5 text-text-tertiary hover:text-text-primary"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <p className="mt-1 text-xs leading-4 text-text-secondary">
                  <span className="font-semibold text-text-primary">Qué hace: </span>
                  {info.what}
                </p>
                {info.tools.length > 0 ? (
                  <p className="mt-1.5 text-xs leading-4 text-text-tertiary">
                    <span className="font-semibold">Usa: </span>
                    {info.tools.join(", ")}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs leading-4 text-text-tertiary">
                    Paso del proceso: se ejecuta al llegar el flujo hasta aquí.
                  </p>
                )}
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
