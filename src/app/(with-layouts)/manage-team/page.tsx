import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { TeamTable } from "./_components/team-table";

export const dynamic = "force-dynamic";

export default function ManageTeamPage() {
  return (
    <div className="space-y-6 p-3 sm:p-6">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Equipo", href: "/manage-team" }]} />
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white">Equipo</h2>
        <p className="text-sm text-text-tertiary">Dueños y miembros con acceso al admin. Los roles controlan /admin/team.</p>
      </div>
      <TeamTable />
    </div>
  );
}
