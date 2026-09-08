import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { Metadata } from "next";
import PieChartOne from "./_components/chart-one";

export const metadata: Metadata = {
  title: "Gráficos de torta",
};

export default function PieChartsPage() {
  return (
    <div className="mt-6 space-y-5">
      {/* Header Section */}
      <div className="flex flex-col-reverse items-start justify-between gap-3 px-2 sm:flex-row sm:items-center lg:px-6">
        <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">Gráficos de torta</h1>

        <Breadcrumbs
          dividerType="chevron"
          items={[
            { href: "/", label: "Inicio" },
            { href: "/charts/pie-charts", label: "Gráficos" },
            { href: "/charts/pie-charts", label: "Gráficos de torta" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 px-2 md:grid-cols-2 lg:px-6">
        <PieChartOne />
      </div>
    </div>
  );
}
