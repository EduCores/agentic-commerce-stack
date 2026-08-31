import FlowCanvas from "@/components/flow/FlowCanvas";
import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { prisma } from "@/lib/adapters/prisma";

export const dynamic = "force-dynamic";

export default async function WorkflowsAdminPage() {
  // Fetch latest workflow for canvas preload (fallback to demo if none)
  const workflow = await prisma.workflowDefinition.findFirst({ orderBy: { updatedAt: "desc" } }).catch(() => null);

  const graph = (workflow?.graph as { nodes: unknown[]; edges: unknown[] } | null) ?? null;

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Workflows", href: "/workflows" },
        ]}
      />
      <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h2 className="mb-1 text-xl font-bold text-black dark:text-white">Monitoreo de Agentes y Flujos en Tiempo Real</h2>
        <p className="mb-4 text-sm text-text-tertiary">
          Creador de flujos integrado — arrastra nodos, conecta y guarda. XYFlow embebido en NextAdmin. Estado en vivo desde Prisma.
        </p>
        <FlowCanvas workflowSlug={workflow?.slug} initialData={graph as never} />
        {workflow && (
          <p className="mt-3 text-xs text-text-tertiary">
            Workflow: <span className="font-medium">{workflow.name}</span> ({workflow.slug}) — v{workflow.version}
          </p>
        )}
      </div>
    </div>
  );
}
