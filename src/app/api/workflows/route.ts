import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

export async function GET() {
  try {
    const workflows = await prisma.workflowDefinition.findMany({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json(workflows);
  } catch (e) {
    console.error("[API-WORKFLOWS] GET error:", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slug, name, graph, trigger } = body;
    if (!slug || !name || !graph) return NextResponse.json({ error: "slug, name, graph required" }, { status: 400 });
    const created = await prisma.workflowDefinition.create({
      data: { slug, name, graph, trigger: trigger ?? "manual", description: body.description },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("[API-WORKFLOWS] POST error:", e);
    return NextResponse.json({ error: "DB error", detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
