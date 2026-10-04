import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { InfoTip } from "@/components/tailgrids/core/info-tip";
import { ErrorsTable } from "./_components/errors-table";

export const dynamic = "force-dynamic";

export default function ErroresPage() {
  return (
    <div className="min-w-0 space-y-6 overflow-hidden p-3 sm:p-6">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Errores", href: "/errores" }]} />
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold tracking-tight text-black dark:text-white">Errores — mini-Sentry</h2>
        <InfoTip label="Acerca de errores">
          Fallos agrupados por causa: el mismo error 500 veces es una sola fila. Email al dueño solo ante causa nueva o spike.
        </InfoTip>
      </div>
      <ErrorsTable />
    </div>
  );
}
