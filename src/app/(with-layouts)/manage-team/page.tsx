import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { TeamTable } from "./_components/team-table";

export const dynamic = "force-dynamic";

export default function ManageTeamPage() {
  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Manage Team", href: "/manage-team" }]} />
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white">Manage Team</h2>
        <p className="text-sm text-text-tertiary">Dueños y miembros con acceso al admin. Los roles controlan /admin/team.</p>
      </div>
      <TeamTable />
    </div>
  );
}
