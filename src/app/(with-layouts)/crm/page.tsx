import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { InfoTip } from "@/components/tailgrids/core/info-tip";
import { CrmDashboard } from "./_components/dashboard";

export const dynamic = "force-dynamic";

export default function CrmPage() {
  return (
    <div className="space-y-6 p-3 sm:p-6">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "CRM", href: "/crm" }]} />
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-black dark:text-white">CRM</h2>
        <InfoTip label="Acerca del CRM">
          Clientes, tareas y actividad ligada a pedidos y agente.
        </InfoTip>
      </div>
      <CrmDashboard />
    </div>
  );
}
