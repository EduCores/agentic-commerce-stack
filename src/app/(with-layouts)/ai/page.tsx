import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { InfoTip } from "@/components/tailgrids/core/info-tip";
import { AiDashboard } from "./_components/dashboard";

export const dynamic = "force-dynamic";

export default function AiPage() {
  return (
    <div className="min-w-0 space-y-6 overflow-hidden p-3 sm:p-6">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "AI", href: "/ai" }]} />
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-black dark:text-white">AI</h2>
        <InfoTip label="Acerca de AI">
          Agentes, uso, costos y workflows de tu tienda.
        </InfoTip>
      </div>
      <AiDashboard />
    </div>
  );
}
