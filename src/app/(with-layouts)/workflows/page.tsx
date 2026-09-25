import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { Badge } from "@/components/tailgrids/core/badge";
import { InfoTip } from "@/components/tailgrids/core/info-tip";
import { prisma } from "@/lib/adapters/prisma";
import { ROUTER_SLUG } from "@/../agent/lib/crew-graph";
import type { FlowGraph } from "@/components/flow/types";
import { WorkflowEditor } from "./_components/workflow-editor";

export const dynamic = "force-dynamic";

/**
 * Página del editor de flujos. Server component: solo lee de Prisma y delega toda
 * la interactividad al cliente (<WorkflowEditor/>), que hace PATCH a /api/workflows/[slug].
 */
export default async function WorkflowsAdminPage({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const params = await searchParams;
  const all = await prisma.workflowDefinition.findMany({ orderBy: { updatedAt: "desc" } }).catch(() => []);

  // Por defecto abrimos el grafo que gobierna al agente (starshop-intent-router)
  const routerWorkflow = all.find((w) => w.slug === ROUTER_SLUG);
  const selected = params.slug ? all.find((w) => w.slug === params.slug) : undefined;
  const workflow = selected ?? routerWorkflow ?? all[0] ?? null;
  const graph = (workflow?.graph as FlowGraph | null) ?? null;
  // Tabs: el router en vivo siempre primero, luego por actualización.
  const ordered = [...all].sort((a, b) => {
    if (a.slug === ROUTER_SLUG) return -1;
    if (b.slug === ROUTER_SLUG) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          { label: "Flujos de trabajo", href: "/workflows" },
        ]}
      />

      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-black dark:text-white">Editor de flujos del agente</h2>
        <InfoTip label="Acerca del editor">El agente lee prompt/modelo/tools de estos nodos.</InfoTip>
        {workflow && (
          <Badge color={workflow.isActive ? "success" : "gray"}>{workflow.isActive ? "publicado" : "borrador"}</Badge>
        )}
      </div>

      <div className="rounded-sm border border-card-border bg-card-background p-6 shadow-sm">
        {workflow && graph ? (
          <WorkflowEditor
            key={workflow.slug}
            slug={workflow.slug}
            initialGraph={graph}
            isActive={workflow.isActive}
            currentSlug={workflow.slug}
            workflows={ordered.map((w) => ({ slug: w.slug, name: w.name, isActive: w.isActive }))}
          />
        ) : workflow ? (
          <p className="text-sm text-text-tertiary">Este flujo todavía no tiene grafo guardado.</p>
        ) : (
          <p className="text-sm text-text-tertiary">Sin flujos de trabajo en la base de datos.</p>
        )}


      </div>
    </div>
  );
}
