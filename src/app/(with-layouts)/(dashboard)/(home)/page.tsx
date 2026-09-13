import { RealStats } from "./_component/real-stats";
import LastTransactionsTable from "./_component/last-transactions-table";

export default function Home() {
  return (
    <div className="mt-6 space-y-5">
      <div className="px-2 lg:px-6">
        <h2 className="mb-1 text-xl font-bold text-black dark:text-white">Panel — Dueño de tienda</h2>
        <p className="text-sm leading-5 text-text-tertiary">
          Métricas reales de tu ACS híbrido: productos, pedidos, agente Star y flujos de trabajo.
        </p>
      </div>

      <div className="space-y-5 px-2 lg:px-5">
        <RealStats />
        <p className="text-xs text-text-tertiary px-2">Abajo: tabla de ejemplo como referencia (TopProducts/Traffic siguen en modo demo para muestra visual; las métricas de arriba ya son reales de Prisma).</p>
        <LastTransactionsTable />
      </div>
    </div>
  );
}
