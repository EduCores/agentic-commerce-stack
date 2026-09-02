import { NextResponse } from "next/server";
import { runAgent } from "@/../agent";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function POST(req: Request) {
  const { message, agentSlug, storeId } = await req.json();
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400, headers: corsHeaders() });
  try {
    const result = await runAgent({ agentSlug: agentSlug ?? "sales-assistant", input: message, storeId });
    const rawCalls = (result.toolCalls ?? []) as unknown as Array<Record<string, unknown>>;
    const toolCalls = rawCalls.map((tc) => {
      const toolName = (tc.toolName ?? tc.name) as string | undefined;
      const input = (tc.input ?? tc.args ?? {}) as Record<string, unknown>;
      const output = (tc.output ?? {}) as Record<string, unknown>;
      const args: Record<string, unknown> = { ...input };
      if (typeof output.navigateTo === "string") args.path = output.navigateTo;
      return { toolName, args, output };
    });

    // Inyección robusta de navegación: si el LLM llamó searchProducts pero NO navigateTo,
    // agregamos /busqueda?q= automáticamente para garantizar la experiencia.
    const hasNavigate = toolCalls.some((tc) => tc.toolName === "navigateTo");
    const searchCall = toolCalls.find((tc) => tc.toolName === "searchProducts");
    if (!hasNavigate && searchCall) {
      const query = ((searchCall.args?.query as string) ?? "").trim();
      if (query) {
        toolCalls.push({
          toolName: "navigateTo",
          args: { path: "/busqueda", query, fromAutoInject: true },
          output: { navigateTo: `/busqueda?q=${encodeURIComponent(query)}` },
        });
        if (!result.text || result.text.trim() === "") {
          result.text = `Busqueda encontrada para "${query}"! Te abri la ventana de resultados con todos los productos disponibles. Le filtro por precio o potencia?`;
        }
      }
    }

    return NextResponse.json({ text: result.text, toolCalls }, { headers: corsHeaders() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500, headers: corsHeaders() });
  }
}