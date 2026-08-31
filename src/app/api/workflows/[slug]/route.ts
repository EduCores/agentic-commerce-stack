import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const wf = await prisma.workflowDefinition.findUnique({ where: { slug } });
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const runs = await prisma.workflowRun.findMany({ where: { workflowId: wf.id }, orderBy: { createdAt: "desc" }, take: 10 });
  const stepLogs = await prisma.orderStepLog.findMany({ where: { workflowRunId: { in: runs.map((r) => r.id) } }, orderBy: { createdAt: "desc" }, take: 30 });
  return NextResponse.json({ workflow: wf, runs, stepLogs });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json();
  const updated = await prisma.workflowDefinition.update({ where: { slug }, data: { graph: body.graph, name: body.name, description: body.description, version: { increment: 1 } } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await prisma.workflowDefinition.delete({ where: { slug } });
  return NextResponse.json({ ok: true });
}
