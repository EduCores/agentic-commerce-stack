import { RealStats } from "./_component/real-stats";
import LastTransactionsTable from "./_component/last-transactions-table";

export default function Home() {
  return (
    <div className="mt-6 space-y-5">
      <div className="px-2 lg:px-6">
        <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">Dashboard — Dueño de tienda</h1>
        <p className="text-sm leading-5 text-text-tertiary">
          Métricas reales del ACS híbrido: productos, pedidos, agente Star y workflows.
        </p>
      </div>

      <div className="space-y-5 px-2 lg:px-5">
        <RealStats />
        <p className="text-xs text-text-tertiary px-2">Abajo: tabla mock de referencia (TopProducts/Traffic siguen mock para demo visual; métricas de arriba ya son reales Prisma).</p>
        <LastTransactionsTable />
      </div>
    </div>
  );
}
