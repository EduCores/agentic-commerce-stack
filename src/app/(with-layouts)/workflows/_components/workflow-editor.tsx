"use client";

/**
 * Cliente del editor de flujos: conecta FlowCanvas con la API de workflows.
 * - Guardar  -> PATCH { graph }        (borrador: no afecta al agente)
 * - Publicar -> PATCH { action, live } (isActive = el agente usa este grafo)
 */
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import FlowCanvas from "@/components/flow/FlowCanvas";
import type { FlowGraph } from "@/components/flow/types";

export function WorkflowEditor({
  slug,
  initialGraph,
  isActive,
  currentSlug,
  workflows,
}: {
  slug: string;
  initialGraph: FlowGraph;
  isActive: boolean;
  currentSlug?: string;
  workflows?: { slug: string; name: string; isActive: boolean }[];
}) {
  const router = useRouter();
  const [live, setLive] = useState(isActive);

  const patch = useCallback(
    async (payload: Record<string, unknown>) => {
      const res = await fetch(`/api/workflows/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error((detail as { detail?: string; error?: string }).detail ?? (detail as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<unknown>;
    },
    [slug],
  );

  const handleSave = useCallback(
    async (graph: FlowGraph) => {
      try {
        await patch({ graph });
        toast.success("Grafo guardado como borrador");
        router.refresh();
      } catch (e) {
        toast.error(`No se pudo guardar: ${e instanceof Error ? e.message : "error desconocido"}`);
      }
    },
    [patch, router],
  );

  const handlePublish = useCallback(async () => {
    const next = !live;
    try {
      await patch({ action: "publish", live: next });
      setLive(next);
      toast.success(next ? "🟢 Publicado: el agente usará este grafo" : "Despublicado: el agente vuelve a la config del código");
      router.refresh();
    } catch (e) {
      toast.error(`No se pudo cambiar la publicación: ${e instanceof Error ? e.message : "error desconocido"}`);
    }
  }, [live, patch, router]);

  return (
    <FlowCanvas
      workflowSlug={slug}
      initialData={initialGraph}
      onSave={handleSave}
      onPublish={handlePublish}
      isLive={live}
      currentSlug={currentSlug}
      workflows={workflows}
    />
  );
}

export default WorkflowEditor;