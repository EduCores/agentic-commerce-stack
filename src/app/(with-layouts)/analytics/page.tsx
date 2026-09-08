import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { AnalyticsDashboard } from "./_components/dashboard";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Analytics", href: "/analytics" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-black dark:text-white">Analytics</h2>
          <p className="text-sm text-text-tertiary">Tendencias reales de tu tienda: ventas, estados, canales y contenido top.</p>
        </div>
        <a href="/api/analytics" className="rounded-lg border border-card-border px-3 py-1.5 text-sm">Export</a>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
