/**
 * DEMO_MOCK — capa visual para mostrar el ACS activo a potenciales clientes
 * cuando aún no hay datos reales en la DB.
 *
 * Actívalo con NEXT_PUBLIC_DEMO_MODE=true en .env o en Vercel.
 * Para vender, ponlo en false o bórralo y redeploy — el sistema vuelve a 100% real.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// Re-exporta mocks existentes para que las APIs los usen como fallback sin duplicar
export { homeOverviewStatsRawData, salesChartMonthlyRawData, inventoryOverviewRawData } from "@/services/api/home/data";
export { packageData } from "@/app/(with-layouts)/tables/basic-tables/_component/package-table/data";
