/**
 * period-stats — deltas y participaciones calculados 100% en cliente
 * sobre datos reales que ya entregan las APIs (sin cambios de API).
 *
 * Delta = 2.ª mitad del período visible vs 1.ª mitad, etiquetado
 * "vs mitad anterior". No inventa períodos fuera de lo visible.
 */

export type DeltaDirection = "up" | "down" | "flat" | "nodata";

/** Suma 2.ª mitad vs 1.ª mitad. null si no hay base de comparación. */
export function halfDelta(values: number[]): { delta: number | null; direction: DeltaDirection } {
  if (values.length < 2) return { delta: null, direction: "nodata" };
  const mid = Math.floor(values.length / 2);
  const first = values.slice(0, mid).reduce((a, v) => a + v, 0);
  const second = values.slice(mid).reduce((a, v) => a + v, 0);
  if (first <= 0) return { delta: second > 0 ? 100 : null, direction: second > 0 ? "up" : "nodata" };
  const delta = Math.round(((second - first) / first) * 1000) / 10;
  return {
    delta,
    direction: delta > 0.05 ? "up" : delta < -0.05 ? "down" : "flat",
  };
}

/** Participación % de una parte sobre el total (1 decimal). */
export function sharePct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}

/** "+12,5%" / "-3,1%" / "0%" / "s/d". */
export function formatDelta(delta: number | null): string {
  if (delta === null || Number.isNaN(delta)) return "s/d";
  if (delta === 0) return "0%";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toLocaleString("es-CL")}%`;
}
