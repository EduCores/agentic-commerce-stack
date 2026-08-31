import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

export async function GET() {
  const workflows = await prisma.workflowDefinition.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(workflows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { slug, name, graph, trigger } = body;
  if (!slug || !name || !graph) return NextResponse.json({ error: "slug, name, graph required" }, { status: 400 });
  const created = await prisma.workflowDefinition.create({
    data: { slug, name, graph, trigger: trigger ?? "manual", description: body.description },
  });
  return NextResponse.json(created, { status: 201 });
}
