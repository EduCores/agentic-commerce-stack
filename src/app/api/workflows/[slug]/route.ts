import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

/**
 * El runtime del agente cachea los overrides del grafo ~60 s por instancia.
 * Al guardar/publicar invalidamos ese caché en la instancia que atiende el PATCH
 * para que el cambio se refleje de inmediato (el resto de instancias lo hacen
 * al expirar el TTL). Best-effort: si falla, el TTL sigue cubriendo el caso.
 */
async function invalidateAgentGraphCache() {
  try {
    const { clearCrewGraphCache } = await import("@/../agent");
    clearCrewGraphCache();
  } catch (e) {
    console.log("[API-WORKFLOW-SLUG] No se pudo invalidar el cache del agente:", e instanceof Error ? e.message : e);
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const url = new URL(_req.url);
    const live = url.searchParams.get("live");

    let wf;
    if (live === "true") {
      wf = await prisma.workflowDefinition.findFirst({ where: { slug, isActive: true } });
    } else {
      wf = await prisma.workflowDefinition.findUnique({ where: { slug } });
    }
    if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const runs = await prisma.workflowRun.findMany({ where: { workflowId: wf.id }, orderBy: { createdAt: "desc" }, take: 10 });
    const stepLogs = await prisma.orderStepLog.findMany({ where: { workflowRunId: { in: runs.map((r) => r.id) } }, orderBy: { createdAt: "desc" }, take: 30 });
    return NextResponse.json({ workflow: wf, runs, stepLogs });
  } catch (e) {
    console.error("[API-WORKFLOW-SLUG] GET error:", e);
    return NextResponse.json({ error: "DB error", detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json();

    // Acción "publish": toggle isActive
    if (body.action === "publish") {
      const updated = await prisma.workflowDefinition.update({
        where: { slug },
        data: { isActive: body.live ?? true },
      });
      await invalidateAgentGraphCache();
      return NextResponse.json(updated);
    }

    const updated = await prisma.workflowDefinition.update({ where: { slug }, data: { graph: body.graph, name: body.name, description: body.description, version: { increment: 1 } } });
    await invalidateAgentGraphCache();
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[API-WORKFLOW-SLUG] PATCH error:", e);
    return NextResponse.json({ error: "DB error", detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await prisma.workflowDefinition.delete({ where: { slug } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[API-WORKFLOW-SLUG] DELETE error:", e);
    return NextResponse.json({ error: "DB error", detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
