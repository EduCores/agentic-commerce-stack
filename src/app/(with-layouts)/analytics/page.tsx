import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { InfoTip } from "@/components/tailgrids/core/info-tip";
import { AnalyticsDashboard } from "./_components/dashboard";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 p-3 sm:p-6">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Analítica", href: "/analytics" }]} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-black dark:text-white">Analítica</h2>
          <InfoTip label="Acerca de analítica">
            Tendencias reales de tu tienda: ventas, estados, canales y contenido top.
          </InfoTip>
        </div>
        <a href="/api/analytics?format=csv" download className="rounded-lg border border-card-border px-3 py-1.5 text-sm">Exportar</a>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
