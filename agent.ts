/**
 * ACS Agent Entry — re-exporta core
 * Mantiene compatibilidad con imports `from "agent"` y `from "@/agent"`
 */
export * from "./agent/index";
export { default } from "./agent/index";
export type { acsTools } from "./agent/index";
