import { NextResponse } from "next/server";
import { runAgent } from "@/../agent";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function GET() {
  const key = process.env.OPENROUTER_API_KEY ?? "";
  return NextResponse.json({
    ok: true,
    hasOpenRouterKey: !!key,
    keyPrefix: key ? key.slice(0, 17) + "..." : "(vacía)",
    keyLength: key.length,
    openRouterModel: process.env.OPENROUTER_MODEL ?? "(no env OPENROUTER_MODEL)",
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    dbUrlHost: (process.env.DATABASE_URL ?? "").replace(/postgres(ql)?:\/\/[^@]*@/, "postgresql://").replace(/:.+@/, "@"),
    time: new Date().toISOString(),
  }, { headers: corsHeaders() });
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
    let autoQuery = "";
    if (!hasNavigate && searchCall) {
      const query = ((searchCall.args?.query as string) ?? "").trim();
      if (query) {
        autoQuery = query;
        toolCalls.push({
          toolName: "navigateTo",
          args: { path: "/busqueda", query, fromAutoInject: true },
          output: { navigateTo: `/busqueda?q=${encodeURIComponent(query)}` },
        });
      }
    }

    // Texto de respaldo: si el LLM devolvió tool calls sin texto, igual respondemos algo útil.
    let text = (result.text ?? "").trim();
    if (!text) {
      if (autoQuery) {
        text = `Busqueda encontrada para "${autoQuery}"! Te abri la ventana de resultados con todos los productos disponibles. Le filtro por precio o potencia?`;
      } else {
        const nav = toolCalls.find((tc) => tc.toolName === "navigateTo");
        if (nav) {
          text = `Te llevo a la tienda para que veas los resultados. Si necesitas algo más especifico, pregunta por un producto o categoria.`;
        } else {
          text = `Claro, dejame ayudarte con eso. Tenemos una gran variedad de productos en la tienda; dime que buscas y te muestro las opciones.`;
        }
      }
    }

    return NextResponse.json({ text, toolCalls }, { headers: corsHeaders() });
  } catch (e) {
        console.error("[API-CHAT] Error:", e);
    return NextResponse.json({
      error: "Internal server error",
      detail: e instanceof Error ? e.message : String(e),
    }, { status: 500, headers: corsHeaders() });
  }
}