import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

export async function GET() {
  const agents = await prisma.agent.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(agents);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, slug, systemPrompt, model } = body;
  if (!name || !slug) return NextResponse.json({ error: "name and slug required" }, { status: 400 });
  const created = await prisma.agent.create({ data: { name, slug, systemPrompt, model: model ?? "gpt-4o-mini", description: body.description, storeId: body.storeId } });
  return NextResponse.json(created, { status: 201 });
}
