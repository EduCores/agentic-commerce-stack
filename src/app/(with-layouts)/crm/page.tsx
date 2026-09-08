import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { CrmDashboard } from "./_components/dashboard";

export const dynamic = "force-dynamic";

export default function CrmPage() {
  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "CRM", href: "/crm" }]} />
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white">CRM</h2>
        <p className="text-sm text-text-tertiary">Clientes, tareas y actividad ligada a pedidos y agente.</p>
      </div>
      <CrmDashboard />
    </div>
  );
}
