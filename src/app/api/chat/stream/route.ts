import { streamStarShopFlow, streamAgent } from "@/../agent";
import { guardChatRequest, corsHeaders, isOriginAllowed } from "@/lib/api/chat-guard";

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  if (!isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: "Origen no permitido" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } });
  }
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

/**
 * POST /api/chat/stream — SSE streaming para efecto tipeo IA
 * Body: { message: string, storeId?: string, agentSlug?: string, useFlow?: boolean }
 * Emite: data: {"type":"meta","detectedIntent":"...","crew":"..."}
 *        data: {"type":"text","text":"chunk..."}
 *        data: {"type":"done","text":"final","toolCalls":[...],"agentSlug":"..."}
 */
export async function POST(req: Request) {
  // Protección: allowlist de orígenes + rate-limit por IP (el proxy interno pasa marcado)
  const guard = guardChatRequest(req, "chat-stream");
  if (!guard.allowed) {
    return new Response(JSON.stringify({ error: guard.error, retryAfter: guard.retryAfter }), { status: guard.status, headers: { "Content-Type": "application/json", ...guard.headers } });
  }

  const { message, history, storeId, agentSlug, useFlow, isAdmin } = await req.json();
  if (!message) {
    return new Response(JSON.stringify({ error: "message required" }), { status: 400, headers: { "Content-Type": "application/json", ...guard.headers } });
  }

  const shouldUseFlow = useFlow !== false;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };
      try {
        const gen = shouldUseFlow
          ? streamStarShopFlow({ input: message, history: history ?? [], storeId, isAdmin: !!isAdmin })
          : streamAgent({ agentSlug: agentSlug ?? "sales-assistant", input: message, history: history ?? [], storeId });

        for await (const chunk of gen) {
          send(chunk);
        }
        // Señal de fin
        send({ type: "end" });
        controller.close();
      } catch (e) {
        send({ type: "error", error: e instanceof Error ? e.message : String(e) });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      ...guard.headers,
    },
  });
}
