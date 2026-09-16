import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, AUTH_COOKIE } from "@/lib/auth";
import { runAgent, runStarShopFlow, refreshCrewOverrides } from "@/../agent";
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

  const { message, history, agentSlug, storeId, useFlow, stream } = await req.json();
  // isAdmin NUNCA viene del cliente: se deriva de la sesión (evita escalada a flujos admin + gasto de la key del dueño)
  const token = (await cookies()).get(AUTH_COOKIE.name)?.value;
  const isAdmin = token ? !!(await verifySessionToken(token)) : false;
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
    let detectedIntent: string | undefined, crew: string | undefined, intentConfidence: number | null, intentSource: string;
    let result: unknown;
    let rawCalls: Array<Record<string, unknown>> = [];
    let toolCalls: Array<{ toolName: string; args: Record<string, unknown>; output: Record<string, unknown> }> = [];
    let text: string;

            if (shouldUseFlow) {
      // Refrescar overrides del grafo (cached 60s) antes de ejecutar el flow
      await refreshCrewOverrides();
      result = await runStarShopFlow({ input: message, history: history ?? [], storeId, isAdmin });
      const r = result as unknown as { detectedIntent?: string; crew?: string; intentConfidence?: number; intentSource?: string; toolCalls?: Array<Record<string, unknown>>; text?: string };
      detectedIntent = r.detectedIntent;
      crew = r.crew;
      intentConfidence = r.intentConfidence ?? null;
      intentSource = r.intentSource ?? "heuristic";
      rawCalls = r.toolCalls ?? [];
      text = (r.text ?? "").trim();
    } else {
      result = await runAgent({ agentSlug: agentSlug ?? "sales-assistant", input: message, history: history ?? [], storeId });
      detectedIntent = undefined;
      crew = undefined;
      intentConfidence = null;
      intentSource = "direct";
      rawCalls = [];
      text = ((result as unknown as { text?: string }).text ?? "").trim();
    }
        const toolCallsMapped: Array<{ toolName: string; args: Record<string, unknown>; output: Record<string, unknown> }> = rawCalls.map((tc) => {
      const toolName = ((tc.toolName ?? tc.name) as string | undefined) ?? "unknown";
      const input = (tc.input ?? tc.args ?? {}) as Record<string, unknown>;
      const output = (tc.output ?? {}) as Record<string, unknown>;
      const args: Record<string, unknown> = { ...input };
      if (typeof output.navigateTo === "string") args.path = output.navigateTo;
      return { toolName, args, output };
    });
    toolCalls = toolCallsMapped;

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