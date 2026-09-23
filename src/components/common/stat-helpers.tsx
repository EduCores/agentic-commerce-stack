import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/utils/cn";
import { formatDelta, type DeltaDirection } from "@/utils/period-stats";

const TONE: Record<DeltaDirection, string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-red-500 dark:text-red-400",
  flat: "text-text-tertiary",
  nodata: "text-text-tertiary",
};

/** Chip ▲/▼ con el delta ya formateado ("vs mitad anterior" va en el title). */
export function DeltaChip({ delta, direction, className }: { delta: number | null; direction: DeltaDirection; className?: string }) {
  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  return (
    <span
      title="2.ª mitad del período vs 1.ª mitad"
      className={cn("inline-flex items-center gap-0.5 text-xs font-bold", TONE[direction], className)}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {formatDelta(delta)}
    </span>
  );
}

type RingProps = {
  /** 0-100 */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: string;
  sub?: string;
  labelClassName?: string;
};

/** Anillo de progreso SVG (estilo "78% Target Achieved" de la referencia). */
export function ProgressRing({
  value,
  size = 72,
  stroke = 8,
  color = "#22C55E",
  track = "rgba(140,140,160,0.18)",
  label,
  sub,
  labelClassName,
}: RingProps) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${v}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * v) / 100}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={cn("text-sm font-extrabold tracking-tight text-text-primary", labelClassName)}>
          {label ?? `${Math.round(v)}%`}
        </span>
        {sub && <span className="mt-0.5 text-[10px] font-medium text-text-tertiary">{sub}</span>}
      </span>
    </span>
  );
}
