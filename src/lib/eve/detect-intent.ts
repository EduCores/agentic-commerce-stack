/**
 * ACS Intent Detection — LLM primero, heurística como fallback mock.
 * Sin datos reales: funciona sin DB y sin API key (cae a heurística).
 */
import { STARSHOP_INTENTS, STARSHOP_WELCOME_PROMPT, type StarShopIntent } from "../../../prisma/starshop-prompts";

export type IntentSource = "llm" | "heuristic";

export type DetectIntentResult = {
  intent: StarShopIntent;
  confidence: number;
  source: IntentSource;
};

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function detectIntentHeuristic(message: string, isAdmin?: boolean): StarShopIntent {
  const t = normalize(message);
  if (isAdmin) {
    if (/^(hola|hola!|hey|buenas|buenos dias|buenas tardes)\b/.test(t.trim())) return "admin_ops";
    if (/(cuanto vendi|cuan vend|ventas hoy|ingresos|stock bajo|bajo stock|crea producto|productos con alerta|pedidos con alerta|agente.*fall|workflow|cuanto se vendio|vendimos)/.test(t)) return "admin_ops";
  }
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

async function detectIntentLLM(message: string): Promise<DetectIntentResult | null> {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) return null;
  const model = process.env.OPENROUTER_MODEL || "qwen/qwen3-30b-a3b-instruct-2507";
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://agentic-commerce-stack.vercel.app",
        "X-Title": "ACS Intent Router",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 120,
        messages: [
          { role: "system", content: `${STARSHOP_WELCOME_PROMPT}\n\nResponde SOLO JSON: {"intent":"<una de ${STARSHOP_INTENTS.join("|")}>","confidence":0.0-1.0}` },
          { role: "user", content: message.slice(0, 500) },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
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
  } catch {
    return null;
  }
}

export async function detectIntent(message: string, opts?: { isAdmin?: boolean }): Promise<DetectIntentResult> {
  const viaLLM = await detectIntentLLM(message);
  if (viaLLM) {
    // admin_ops solo en contexto admin: si el LLM lo devuelve en tienda, corrige a heurística
    if (viaLLM.intent === "admin_ops" && !opts?.isAdmin) {
      return { intent: detectIntentHeuristic(message, opts?.isAdmin), confidence: 0.6, source: "heuristic" };
    }
    return viaLLM;
  }
  return { intent: detectIntentHeuristic(message, opts?.isAdmin), confidence: 0.6, source: "heuristic" };
}
