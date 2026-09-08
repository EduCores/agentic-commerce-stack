import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { AiDashboard } from "./_components/dashboard";

export const dynamic = "force-dynamic";

export default function AiPage() {
  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "AI", href: "/ai" }]} />
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white">AI</h2>
        <p className="text-sm text-text-tertiary">Agentes, uso, costos y workflows de tu tienda.</p>
      </div>
      <AiDashboard />
    </div>
  );
}
