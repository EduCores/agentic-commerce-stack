import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { MarketingDashboard } from "./_components/dashboard";

export const dynamic = "force-dynamic";

export default function MarketingPage() {
  return (
    <div className="space-y-6 p-3 sm:p-6">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Marketing", href: "/marketing" }]} />
      <MarketingDashboard />
    </div>
  );
}
