import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { InfoTip } from "@/components/tailgrids/core/info-tip";
import { TeamTable } from "./_components/team-table";

export const dynamic = "force-dynamic";

export default function ManageTeamPage() {
  return (
    <div className="space-y-6 p-3 sm:p-6">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Equipo", href: "/manage-team" }]} />
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-black dark:text-white">Equipo</h2>
        <InfoTip label="Acerca del equipo">
          Dueños y miembros con acceso al admin. Los roles controlan /admin/team.
        </InfoTip>
      </div>
      <TeamTable />
    </div>
  );
}
