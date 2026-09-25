/**
 * ACS Intent Detection — LLM primero, heurística como fallback mock.
 * Sin datos reales: funciona sin DB y sin API key (cae a heurística).
 */
import { STARSHOP_INTENTS, STARSHOP_WELCOME_PROMPT, STARSHOP_CREW_MODEL, buildModelChain, isDailyFreeQuotaError, markModelExhausted, type StarShopIntent } from "../../../prisma/starshop-prompts";
import { isSmallTalk, isAgentMetaQuestion } from "../../../agent/lib/search/normalize";
import { hasProviderKey, headersFor, resolveModel } from "../../../agent/lib/model-provider";

export type IntentSource = "llm" | "heuristic";

export type DetectIntentResult = {
  intent: StarShopIntent;
  confidence: number;
  source: IntentSource;
};

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Contexto de conversación previa para la clasificación: resumen comprimido de los
 * últimos turnos para que detectIntent no cambie de crew a mitad de conversación
 * (ej: "¿cuánto con despacho?" tras hablar de un proyector debe seguir checkout/product_search).
 */
function historyContext(history?: unknown[], max = 4): string {
  if (!Array.isArray(history) || history.length === 0) return "";
  const lines = (history as Array<{ role?: string; text?: string; content?: string }>)
    .slice(-max)
    .map((m) => {
      if (!m || typeof m !== "object") return "";
      const t = ((m.text ?? m.content) ?? "").toString().trim().slice(0, 300);
      if (!t) return "";
      return `${m.role === "user" ? "Cliente" : "Star"}: ${t}`;
    })
    .filter(Boolean)
    .join("\n");
  return lines ? `\n\nConversación previa (contexto):\n${lines}` : "";
}

export function detectIntentHeuristic(message: string, isAdmin?: boolean): StarShopIntent {
  const t = normalize(message);
  if (isAdmin) {
    if (/^(hola|hola!|hey|buenas|buenos dias|buenas tardes)\b/.test(t.trim())) return "admin_ops";
    if (/(cuanto vendi|cuan vend|ventas(?!@)|vendidos?|ingresos|facturacion|reporte|resumen.*ventas|como andan|como van|stock bajo|bajo stock|crea producto|productos con alerta|pedidos con alerta|agente.*fall|workflow|cuanto se vendio|vendimos)/.test(t)) return "admin_ops";
  }
  // Preguntas sobre el propio asistente ("¿estás conectado?", "¿me escuchas?",
  // "¿eres un bot?"): SIEMPRE general_inquiry, nunca búsqueda de catálogo.
  // Se evalúa ANTES que isSmallTalk porque cubre tokens desconocidos ("cnectado").
  if (isAgentMetaQuestion(message)) return "general_inquiry";
  // Charla social ("hola", "estamos de vuelta?", "gracias") nunca es búsqueda:
  // va al crew de soporte, que responde conversando y reencauza.
  if (isSmallTalk(message)) return "general_inquiry";
  if (/(devol|devoluci|cambio.*producto|garant.*falla|no me sirve.*devolver)/.test(t)) return "return_request";
  if (/(carrito abandon|deje.*carrito|carrito.*abandon|retomar compr|abandon.*cart|carrito.*no pude pagar|quedo.*carrito)/.test(t)) return "abandoned_cart";
  if (/(donde esta|seguimiento|estado.*pedido|track.*order|rastrear|wismo|donde va.*pedido)/.test(t)) return "order_tracking";
  if (/(compara.*precio|precio.*competencia|cotiz.*otro|mas barato|mejor precio|precio.*otro lado)/.test(t)) return "price_comparison";
  if (/(pagar|checkout|carrito.*pago|despacho.*pago|metodo de pago|confirmar.*pedido|finalizar.*compra|quiero comprar|procesar.*compra)/.test(t)) return "checkout_support";
  if (/(politica|envio|garantia|horario|contacto|quienes son|tienda.*info|como compr)/.test(t)) return "general_inquiry";
  if (/(hablar con|ejecutivo|humano|asesor|ventas@|llamar.*vendedor|persona real)/.test(t)) return "escalate_human";
  return "product_search";
}

function isValidIntent(v: unknown): v is StarShopIntent {
  return typeof v === "string" && (STARSHOP_INTENTS as readonly string[]).includes(v);
}

async function detectIntentLLM(message: string, history?: unknown[]): Promise<DetectIntentResult | null> {
  // El router usa cualquier provider con credencial (OpenRouter y/o Groq).
  if (!hasProviderKey("openrouter") && !hasProviderKey("groq")) return null;
  const preferred = process.env.OPENROUTER_MODEL || STARSHOP_CREW_MODEL;
  // Cadena de respaldo: si el principal está sin cupo/saturado (402/429/5xx) se
  // prueba el siguiente modelo gratis. Un timeout NO encadena (sumaría otra espera
  // de 8s al router): se cae a la heurística como antes.
  for (const model of buildModelChain(preferred)) {
    const resolved = resolveModel(model);
    if (!resolved) continue;
    try {
      const r = await fetch(`${resolved.baseURL}/chat/completions`, {
        method: "POST",
        headers: headersFor(resolved),
        body: JSON.stringify({
          model: resolved.upstreamId,
          temperature: 0,
          max_tokens: 160,
          messages: [
            { role: "system", content: `${STARSHOP_WELCOME_PROMPT}\n\nSi la consulta continúa una conversación previa, usa la conversación como contexto para clasificar (ej: después de preguntar por un producto, "¿cuánto con despacho?" es checkout_support; "¿y ese taladro qué tal?" es product_search).\n\nResponde SOLO JSON: {"intent":"<una de ${STARSHOP_INTENTS.join("|")}>","confidence":0.0-1.0}` },
            { role: "user", content: message.slice(0, 500) + historyContext(history) },
          ],
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) {
        if (r.status === 402 || r.status === 429 || r.status >= 500) {
          // 429 por cuota diaria de free: marcar para no reintentar en los siguientes mensajes.
          if (r.status === 429) {
            const detail = await r.text().catch(() => "");
            if (isDailyFreeQuotaError(detail)) markModelExhausted(model);
          }
          console.log(`[ACS-ROUTER] modelo ${model} no disponible (HTTP ${r.status}), probando siguiente`);
          continue;
        }
        return null; // 400/401: cambiar de modelo no lo arregla
      }
      const j = await r.json();
      const raw: string = (j?.choices?.[0]?.message?.content ?? "").trim();
      // Extrae JSON aunque venga con texto extra
      const match = raw.match(/\{[^}]*\}/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]) as { intent?: unknown; confidence?: unknown };
      if (!isValidIntent(parsed.intent)) return null;
      const confidence = typeof parsed.confidence === "number"
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.75;
      return { intent: parsed.intent, confidence, source: "llm" };
    } catch (e) {
      // Timeout/abort: no encadenar otro modelo (duplicaría la espera) -> heurística
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) return null;
      console.log(`[ACS-ROUTER] modelo ${model} error de red, probando siguiente`, e instanceof Error ? e.message : e);
    }
  }
  return null;
}

export async function detectIntent(message: string, opts?: { isAdmin?: boolean; history?: unknown[] }): Promise<DetectIntentResult> {
  const viaLLM = await detectIntentLLM(message, opts?.history);
  if (viaLLM) {
    // admin_ops solo en contexto admin: si el LLM lo devuelve en tienda, corrige a heurística
    if (viaLLM.intent === "admin_ops" && !opts?.isAdmin) {
      return { intent: detectIntentHeuristic(message, opts?.isAdmin), confidence: 0.6, source: "heuristic" };
    }
    // El router LLM tiende a mandar charla social ("estamos de vuelta?") o
    // preguntas sobre el propio asistente ("¿estás conectado?") a product_search
    // con confianza alta; se corrige ANTES de que el crew de productos ejecute
    // searchProducts y anuncie una búsqueda que no corresponde.
    if (viaLLM.intent === "product_search" && (isAgentMetaQuestion(message) || isSmallTalk(message))) {
      return { intent: "general_inquiry", confidence: 0.9, source: "heuristic" };
    }
    return viaLLM;
  }
  return { intent: detectIntentHeuristic(message, opts?.isAdmin), confidence: 0.6, source: "heuristic" };
}
