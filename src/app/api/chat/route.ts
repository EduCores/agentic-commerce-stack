import { NextResponse } from "next/server";
import { runAgent, runStarShopFlow } from "@/../agent";
import { guardChatRequest, corsHeaders, isOriginAllowed } from "@/lib/api/chat-guard";

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  if (!isOriginAllowed(origin)) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403, headers: corsHeaders(origin) });
  }
  return NextResponse.json({}, { headers: corsHeaders(origin) });
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  // Solo booleans/model: NO exponer prefijos de API key ni host de BD en un endpoint público
  return NextResponse.json({
    ok: true,
    hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
    hasAdminKey: !!process.env.OPENROUTER_ADMIN_KEY,
    openRouterModel: process.env.OPENROUTER_MODEL ?? "(no env OPENROUTER_MODEL)",
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    time: new Date().toISOString(),
  }, { headers: corsHeaders(origin) });
}

export async function POST(req: Request) {
  // Protección: allowlist de orígenes + rate-limit por IP
  const guard = guardChatRequest(req, "chat");
  if (!guard.allowed) {
    return NextResponse.json({ error: guard.error, retryAfter: guard.retryAfter }, { status: guard.status, headers: guard.headers });
  }

  const { message, history, agentSlug, storeId, useFlow, stream, isAdmin } = await req.json();
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400, headers: guard.headers });
  // Si el frontend pide stream:true, redirige a lógica SSE sin romper compatibilidad JSON
  if (stream) {
    const url = new URL(req.url);
    url.pathname = "/api/chat/stream";
    const r = await fetch(url.toString(), { method: "POST", headers: { "Content-Type": "application/json", "x-acs-internal-proxy": "1" }, body: JSON.stringify({ message, history, agentSlug, storeId, useFlow, isAdmin }), signal: (req as unknown as { signal?: AbortSignal }).signal });
    // Proxy streaming response tal cual
    return new Response(r.body, { status: r.status, headers: { "Content-Type": "text/event-stream", ...guard.headers } });
  }
  try {
    // Flujo 1→2→9 por defecto — router StarShop. isAdmin fuerza admin_ops para el admin.
    const shouldUseFlow = useFlow !== false;
    const result = shouldUseFlow
      ? await runStarShopFlow({ input: message, history: history ?? [], storeId, isAdmin: !!isAdmin })
      : await runAgent({ agentSlug: agentSlug ?? "sales-assistant", input: message, history: history ?? [], storeId });
    const detectedIntent = (result as unknown as { detectedIntent?: string }).detectedIntent;
    const crew = (result as unknown as { crew?: string }).crew;
    const intentConfidence = (result as unknown as { intentConfidence?: number }).intentConfidence ?? null;
    const intentSource = (result as unknown as { intentSource?: string }).intentSource ?? "heuristic";
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
    // (finalText ya incluye directFallback desde runAgent; texto vacío aquí significa que todo falló)
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

    return NextResponse.json({ text, toolCalls, detectedIntent, crew, intentConfidence, intentSource }, { headers: guard.headers });
  } catch (e) {
    console.error("[API-CHAT] Error:", e);
    return NextResponse.json({
      error: "Internal server error",
      detail: e instanceof Error ? e.message : String(e),
    }, { status: 500, headers: guard.headers });
  }
}