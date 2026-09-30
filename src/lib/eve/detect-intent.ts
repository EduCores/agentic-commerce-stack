/**
 * ACS Intent Detection — LLM primero, heurística como fallback mock.
 * Sin datos reales: funciona sin DB y sin API key (cae a heurística).
 */
import { STARSHOP_INTENTS, STARSHOP_WELCOME_PROMPT, STARSHOP_CREW_MODEL, buildModelChain, isDailyFreeQuotaError, markModelExhausted, type StarShopIntent } from "../../../prisma/starshop-prompts";
import { isSmallTalk, isAgentMetaQuestion } from "../../../agent/lib/search/normalize";
import { hasProviderKey, headersFor, resolveModel } from "../../../agent/lib/model-provider";
import {
  buildAttempt,
  isJsonModeFailure,
  markModeUnreliable,
  modesFor,
  structuredOutputsEnabled,
  type JsonMode,
  type JsonSchemaSpec,
} from "../../../agent/lib/structured-output";

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

/**
 * Esquema del router (structured outputs). Todos los campos en `required` +
 * `additionalProperties: false`: es lo que exige el modo strict de los
 * proveedores y lo que hace la respuesta verificable sin regex.
 */
const INTENT_SCHEMA: JsonSchemaSpec = {
  name: "starshop_intent",
  schema: {
    type: "object",
    properties: {
      intent: {
        type: "string",
        enum: [...STARSHOP_INTENTS],
        description: "Intención principal del cliente (una sola)",
      },
      confidence: { type: "number", description: "Confianza de 0 a 1" },
    },
    required: ["intent", "confidence"],
    additionalProperties: false,
  },
};

/**
 * Presupuesto del router: no puede comerse el tiempo del agente.
 * Con la escalera (modo verificado → json_object → texto) un modelo puede
 * consumir más de un intento, así que acotamos intentos y tiempo total.
 */
const ROUTER_MAX_ATTEMPTS = Number(process.env.ACS_ROUTER_MAX_ATTEMPTS ?? 4);
const ROUTER_TOTAL_BUDGET_MS = Number(process.env.ACS_ROUTER_BUDGET_MS ?? 9_000);

/** Traza de los últimos intentos (diagnóstico: `npm run test:router`). */
export type RouterTraceEntry = {
  model: string;
  mode: JsonMode | "none";
  status: number | "ok" | "error";
  note?: string;
};
const routerTrace: RouterTraceEntry[] = [];
export function getRouterTrace(): RouterTraceEntry[] {
  return [...routerTrace];
}
export function resetRouterTrace(): void {
  routerTrace.length = 0;
}
function trace(entry: RouterTraceEntry): void {
  routerTrace.push(entry);
  if (routerTrace.length > 30) routerTrace.shift();
}

/** Extrae {intent, confidence} del texto, venga limpio o con envoltorio. */
function parseIntentReply(raw: string): DetectIntentResult | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { intent?: unknown; confidence?: unknown };
    if (!isValidIntent(parsed.intent)) return null;
    const confidence =
      typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.75;
    return { intent: parsed.intent, confidence, source: "llm" };
  } catch {
    return null;
  }
}

async function detectIntentLLM(message: string, history?: unknown[]): Promise<DetectIntentResult | null> {
  // El router usa cualquier provider con credencial (OpenRouter, Groq y/o Google directo).
  if (!hasProviderKey("openrouter") && !hasProviderKey("groq") && !hasProviderKey("google")) return null;
  const preferred = process.env.OPENROUTER_MODEL || STARSHOP_CREW_MODEL;
  const structured = structuredOutputsEnabled("router");
  const startedAt = Date.now();
  let attempts = 0;
  // Cadena de respaldo: si el principal está sin cupo/saturado (402/429/5xx) se
  // prueba el siguiente modelo gratis. Un timeout NO encadena (sumaría otra espera
  // de 8s al router): se cae a la heurística como antes.
  for (const model of buildModelChain(preferred)) {
    const resolved = resolveModel(model);
    if (!resolved) continue;
    // Escalera por modelo: modo verificado → json_object → texto+regex. Un 400 de
    // validación JSON baja de modo ANTES de descartar el modelo (una respuesta útil
    // no se convierte en error); 402/429/5xx siguen saltando al modelo siguiente.
    const modes: JsonMode[] = structured ? modesFor(model) : ["text"];
    for (const mode of modes) {
      if (attempts >= ROUTER_MAX_ATTEMPTS) return null;
      if (Date.now() - startedAt > ROUTER_TOTAL_BUDGET_MS) {
        console.log("[ACS-ROUTER] presupuesto agotado, cae a heurística");
        return null;
      }
      attempts++;
      const attempt = buildAttempt(model, mode, INTENT_SCHEMA);
      try {
        const r = await fetch(`${resolved.baseURL}/chat/completions`, {
          method: "POST",
          headers: headersFor(resolved),
          body: JSON.stringify({
            model: resolved.upstreamId,
            temperature: 0,
            max_tokens: 160,
            messages: [
              { role: "system", content: `${STARSHOP_WELCOME_PROMPT}\n\nSi la consulta continúa una conversación previa, usa la conversación como contexto para clasificar (ej: después de preguntar por un producto, "¿cuánto con despacho?" es checkout_support; "¿y ese taladro qué tal?" es product_search). price_comparison es SOLO si menciona otra tienda, competencia, "más barato en otro lado" o precios externos; una pregunta simple de precio ("¿cuánto cuesta X?") es product_search.\n\nResponde SOLO JSON: {"intent":"<una de ${STARSHOP_INTENTS.join("|")}>","confidence":0.0-1.0}` },
              { role: "user", content: message.slice(0, 500) + historyContext(history) },
            ],
            ...(attempt.responseFormat ? { response_format: attempt.responseFormat } : {}),
            ...attempt.extras,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (!r.ok) {
          const detail = await r.text().catch(() => "");
          // El modelo no produjo JSON conforme al modo: se marca el modo y se
          // reintenta el MISMO modelo bajando de escalera (no se descarta).
          if (isJsonModeFailure(r.status, detail)) {
            markModeUnreliable(model, mode);
            trace({ model, mode, status: r.status, note: "json inválido" });
            continue;
          }
          // 429 por cuota diaria de free: marcar para no reintentar en los siguientes mensajes.
          if (r.status === 429 && isDailyFreeQuotaError(detail)) markModelExhausted(model);
          if (r.status === 402 || r.status === 429 || r.status >= 500) {
            console.log(`[ACS-ROUTER] modelo ${model} no disponible (HTTP ${r.status}), probando siguiente`);
            trace({ model, mode, status: r.status, note: "no disponible" });
            break; // siguiente modelo
          }
          if (r.status === 401) return null; // credencial inválida: cambiar de modelo no lo arregla
          trace({ model, mode, status: r.status, note: "error duro" });
          break; // 400 no-JSON: siguiente modelo (comportamiento histórico)
        }
        const j = await r.json();
        const raw: string = (j?.choices?.[0]?.message?.content ?? "").trim();
        const parsed = parseIntentReply(raw);
        if (!parsed) {
          // Respuesta ilegible en este modo: se prueba el modo siguiente del mismo modelo.
          trace({ model, mode, status: "ok", note: "sin JSON parseable" });
          continue;
        }
        trace({ model, mode, status: "ok" });
        return parsed;
      } catch (e) {
        // Timeout/abort: no encadenar otro modelo (duplicaría la espera) -> heurística
        if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
          trace({ model, mode, status: "error", note: "timeout" });
          return null;
        }
        console.log(`[ACS-ROUTER] modelo ${model} error de red, probando siguiente`, e instanceof Error ? e.message : e);
        trace({ model, mode, status: "error", note: "red" });
        break; // siguiente modelo
      }
    }
  }
  return null;
}

/**
 * Señal de comparación EXTERNA de precios ("otra tienda", "más barato",
 * "sodimac", URL…). Sin ella, una pregunta de precio ("¿cuánto cuesta X?")
 * es product_search: el crew de búsqueda la responde con searchProducts +
 * calculatePricing. Mandarla a price_comparison dispara scrapes a Jina sin
 * referencia externa que comparar (medido: "cuanto cuesta el distanciometro"
 * ruteaba mal a price_comparison).
 */
export function hasExternalPriceSignal(message: string): boolean {
  const t = normalize(message);
  return /(otr[ao]s? (tienda|lado|parte)|mas barato|mejor precio|competencia|comparar?|http|www\.|mercadolibre|sodimac|easy\b|construmart|homecenter|precio.*(fuera|externo))/i.test(t);
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
    // El router LLM manda preguntas simples de precio ("¿cuánto cuesta X?")
    // a price_comparison, cuyo crew scrapea tiendas externas sin tener qué
    // comparar. Sin señal externa explícita, es product_search (el crew de
    // búsqueda responde con searchProducts + calculatePricing).
    if (viaLLM.intent === "price_comparison" && !hasExternalPriceSignal(message)) {
      return { intent: "product_search", confidence: 0.8, source: "heuristic" };
    }
    return viaLLM;
  }
  return { intent: detectIntentHeuristic(message, opts?.isAdmin), confidence: 0.6, source: "heuristic" };
}
