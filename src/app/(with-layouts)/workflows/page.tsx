import FlowCanvas from "@/components/flow/FlowCanvas";
import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { prisma } from "@/lib/adapters/prisma";

export const dynamic = "force-dynamic";

export default async function WorkflowsAdminPage({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const params = await searchParams;
  const all = await prisma.workflowDefinition.findMany({ orderBy: { updatedAt: "desc" } }).catch(() => []);
  const workflow = params.slug ? all.find((w) => w.slug === params.slug) ?? all[0] : all[0];
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
        {all.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {all.map((w) => (
              <a
                key={w.slug}
                href={`/workflows?slug=${w.slug}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium border ${w.slug === workflow?.slug ? "bg-primary text-white border-primary" : "bg-white text-text-primary border-stroke hover:bg-gray-50"}`}
              >
                {w.name}
              </a>
            ))}
          </div>
        )}
        <FlowCanvas key={workflow?.slug} workflowSlug={workflow?.slug} initialData={graph as never} />
        {workflow && (
          <p className="mt-3 text-xs text-text-tertiary">
            Workflow: <span className="font-medium">{workflow.name}</span> ({workflow.slug}) — v{workflow.version}
          </p>
        )}
        {all.length === 0 && <p className="text-sm text-text-tertiary">Sin workflows en DB</p>}
      </div>
    </div>
  );
}
