import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { MarketingDashboard } from "./_components/dashboard";

export const dynamic = "force-dynamic";

export default function MarketingPage() {
  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Marketing", href: "/marketing" }]} />
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white">Marketing</h2>
        <p className="text-sm text-text-tertiary">Canales, funnel y campañas ligadas a tus tiendas y pedidos reales.</p>
      </div>
      <MarketingDashboard />
    </div>
  );
}
