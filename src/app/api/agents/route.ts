import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, AUTH_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/adapters/prisma";

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({ orderBy: { createdAt: "desc" } });
    // Defensa en profundidad: los systemPrompt son IP del negocio; el rol
    // member ve la lista pero nunca los prompts (el middleware además le
    // bloquea /agents y /api/agents completos).
    const token = (await cookies()).get(AUTH_COOKIE.name)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (session?.role === "member") {
      return NextResponse.json(agents.map((a) => ({ ...a, systemPrompt: null })));
    }
    return NextResponse.json(agents);
  } catch (e) {
    console.error("[API-AGENTS] GET error:", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, slug, systemPrompt, model } = body;
    if (!name || !slug) return NextResponse.json({ error: "name and slug required" }, { status: 400 });
    const created = await prisma.agent.create({ data: { name, slug, systemPrompt, model: model ?? "nvidia/nemotron-3-ultra-550b-a55b", description: body.description, storeId: body.storeId } });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("[API-AGENTS] POST error:", e);
    return NextResponse.json({ error: "DB error", detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
