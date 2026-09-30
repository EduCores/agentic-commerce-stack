/**
 * Zonas de despacho StarShop (módulo puro, sin BD: testeable en evals).
 *
 * Fuente de verdad de la tarifa oficial (general_support regla 2):
 * - RM: $3.990 (24-48h), GRATIS sobre $49.990.
 * - Central (Valparaíso, O'Higgins, Maule): $4.990 (48-72h).
 * - Norte y Sur: $6.990 (3-4 días hábiles).
 * - Extremas (Aysén, Magallanes, Arica): $9.990 (4-6 días hábiles).
 */

export const REGION_COSTS: Record<string, { cost: number; days: string }> = {
  rm: { cost: 3990, days: "24-48h" },
  central: { cost: 4990, days: "48-72h" },
  norte: { cost: 6990, days: "3-4 días" },
  sur: { cost: 6990, days: "3-4 días" },
  extremo: { cost: 9990, days: "4-6 días" },
};

/** Normaliza una región a zona tarifaria (tolera tildes y mayúsculas). */
export function zoneForRegion(region: string): string {
  const r = region
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (r.includes("metropolitana") || r.includes("santiago")) return "rm";
  if (r.includes("valpara") || r.includes("higgins") || r.includes("maule")) return "central";
  if (r.includes("aysen") || r.includes("aisen") || r.includes("magallanes") || r.includes("arica")) return "extremo";
  if (
    r.includes("tarapaca") || r.includes("antofagasta") || r.includes("atacama") || r.includes("coquimbo") || r.includes("norte")
  ) return "norte";
  return "sur";
}
