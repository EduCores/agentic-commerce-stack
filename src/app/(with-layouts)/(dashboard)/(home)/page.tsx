import { RealStats } from "./_component/real-stats";
import { InfoTip } from "@/components/tailgrids/core/info-tip";
import LastTransactionsTable from "./_component/last-transactions-table";

export default function Home() {
  const today = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="mt-4 min-w-0 space-y-5">
      <div className="min-w-0 px-2 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-black dark:text-white">Panel — Dueño de tienda</h2>
            <InfoTip label="Acerca del panel">
              Todo tu ACS en un vistazo: ventas, stock, clientes, marketing y automatización.
            </InfoTip>
          </div>
          <p className="rounded-full border border-card-border bg-card-background px-3 py-1.5 text-xs font-medium capitalize text-text-tertiary">
            {today}
          </p>
        </div>
      </div>

      <div className="min-w-0 space-y-5 overflow-x-clip px-2 lg:px-5">
        <RealStats />
        <LastTransactionsTable />
      </div>
    </div>
  );
}
