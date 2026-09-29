/**
 * ACS Structured Outputs — capacidades por modelo + payloads JSON tipados.
 *
 * POR QUÉ EXISTE: OpenRouter ofrece `response_format` con `json_schema` (strict) y
 * el plugin `response-healing` (solo non-streaming). Nuestros dos únicos puntos que
 * consumen JSON del modelo (router de intención y script de enriquecimiento) lo
 * parseaban con regex/recortes manuales. Este módulo centraliza:
 *
 *  1) QUÉ MODO PUEDE USAR CADA MODELO — medido, no asumido. El soporte es por
 *     modelo Y por endpoint, y `strict` no siempre se aplica. Medido 2026-09-28
 *     con requests reales de ~60 tokens:
 *       - groq/qwen/qwen3.8-27b + strict:true → acepta el parámetro pero NO aplica
 *         constrained decoding (con un prompt que pedía prosa devolvió 400
 *         `json_validate_failed`). En `json_object` responde 200. → modo json_object.
 *       - groq/openai/gpt-oss-120b + json_object y + strict → 400. → modo text
 *         (hoy ese modelo nos sirve para prosa/tool-calling, no para JSON).
 *       - OpenRouter (/api/v1/models → supported_parameters): structured_outputs
 *         =True en los 5 pagados, qwen3.8-27b:free y nemotron-super-120b:free;
 *         =False en nemotron-3.5-lightning:free, nemotron-ultra:free y gemma-4:free.
 *
 *  2) LA ESCALERA por modelo (modo verificado → json_object → texto con regex):
 *     un fallo de JSON baja de modo ANTES de descartar el modelo, para no
 *     convertir una respuesta útil en un error duro.
 *
 *  3) EXTRAS SOLO-OPENROUTER (`provider.require_parameters` para enrutar solo a
 *     endpoints que soporten el parámetro, y plugin `response-healing`):
 *     SIEMPRE gateadas por proveedor, porque los modelos `groq/*` reutilizan el
 *     provider OpenAI-compatible y Groq rechaza (400) los campos que no entiende.
 *
 * APRENDIZAJE EN RUNTIME: ante un 400 de validación JSON se marca ESE modo como
 * no fiable para ese modelo en memoria (mismo patrón que markModelExhausted de la
 * cuota diaria) y las siguientes llamadas arrancan en el modo siguiente.
 * Diagnóstico/reset: resetStructuredOutputCache() / unreliableSummary().
 *
 * FLAG: ACS_STRUCTURED_OUTPUTS = off | router | scripts | all  (default: all).
 */
import { isGeminiModel, isGroqModel } from "./model-provider";

export type JsonMode = "schema_strict" | "json_object" | "text";

/** Esquema JSON a exigir (nombre + JSON Schema). */
export type JsonSchemaSpec = { name: string; schema: Record<string, unknown> };

/**
 * Modo INICIAL verificado por modelo (medido 2026-09-28). Lo que no está aquí
 * usa `text` (comportamiento histórico: prompt + regex): es el default más
 * conservador y evita romper modelos que no probamos.
 */
const VERIFIED_MODES: Record<string, JsonMode> = {
  // ── Groq (plan gratuito, 1.000 req/día) ──
  "groq/qwen/qwen3.8-27b": "json_object",
  "groq/openai/gpt-oss-120b": "text",
  "groq/openai/gpt-oss-20b": "text",
  // ── Google directo (AI Studio): endpoint OpenAI-compatible. Acepta
  //    response_format json_object (verificado 2026-09-29: 200 + tool-calling con
  //    gemini-flash-lite-latest). Como Groq/Gemini-directo no es OpenRouter, los
  //    extras de OpenRouter nunca se le envían (ver buildAttempt). Arranca en
  //    json_object; si un día falla la validación, la escalera baja a text sola.
  "gemini/gemini-flash-latest": "json_object",
  "gemini/gemini-flash-lite-latest": "json_object",
  // ── OpenRouter pagados (structured_outputs=True en la metadata del modelo) ──
  "openai/gpt-oss-120b": "schema_strict",
  "qwen/qwen3-30b-a3b-instruct-2507": "schema_strict",
  "meta-llama/llama-3.3-70b-instruct": "schema_strict",
  "openai/gpt-4o-mini": "schema_strict",
  "google/gemini-2.5-flash": "schema_strict",
  // ── OpenRouter :free (cuota escasa) — solo los verificados con soporte ──
  "qwen/qwen3.8-27b:free": "schema_strict",
  "nvidia/nemotron-3-super-120b-a12b:free": "schema_strict",
  "nvidia/nemotron-3.5-lightning:free": "text",
  "nvidia/nemotron-3-ultra-550b-a55b:free": "text",
  "google/gemma-4-31b-it:free": "text",
  "google/gemma-4-26b-a4b-it:free": "text",
};

/** Default conservador para modelos sin medición. */
const DEFAULT_MODE: JsonMode = "text";

/** Modelo → modos que ya fallaron con 400 de validación JSON. */
const unreliable = new Map<string, Set<JsonMode>>();

/** Limpia el aprendizaje en runtime (tests / reinicio manual). */
export function resetStructuredOutputCache(): void {
  unreliable.clear();
}

/** Snapshot del aprendizaje (diagnóstico). */
export function unreliableSummary(): Array<{ model: string; modes: JsonMode[] }> {
  return Array.from(unreliable.entries()).map(([model, modes]) => ({ model, modes: Array.from(modes) }));
}

/** Modo siguiente hacia abajo en la escalera (o null si ya es texto). */
function nextModeDown(mode: JsonMode): JsonMode | null {
  if (mode === "schema_strict") return "json_object";
  if (mode === "json_object") return "text";
  return null;
}


/**
 * Escalera de intentos para un modelo: arranca en su modo verificado y baja
 * (schema_strict → json_object → text), omitiendo los modos marcados como no
 * fiables en runtime. `text` siempre queda como último recurso.
 */
export function modesFor(modelId: string): JsonMode[] {
  const bad = unreliable.get(modelId);
  const modes: JsonMode[] = [];
  let mode: JsonMode | null = VERIFIED_MODES[modelId] ?? DEFAULT_MODE;
  while (mode) {
    if (!bad?.has(mode)) modes.push(mode);
    mode = nextModeDown(mode);
  }
  if (!modes.includes("text")) modes.push("text");
  return modes;
}

/** Modo inicial efectivo (para logs/diagnóstico). */
export function capabilityFor(modelId: string): JsonMode {
  return modesFor(modelId)[0];
}

/** Un paso de la escalera: qué `response_format` y qué extras enviar. */
export type JsonAttempt = {
  mode: JsonMode;
  responseFormat?: Record<string, unknown>;
  extras: Record<string, unknown>;
};

/**
 * Construye el payload de un intento. `spec` es obligatorio para `schema_strict`
 * (sin esquema no hay nada que exigir y se cae a texto).
 *
 * EXTRAS SOLO-OPENROUTER: en Groq y Google directo rebotarían con 400 (el
 * provider reutilizado no filtra los campos exclusivos de OpenRouter), así que
 * se gatean por proveedor.
 */
export function buildAttempt(modelId: string, mode: JsonMode, spec?: JsonSchemaSpec): JsonAttempt {
  const isOpenRouter = !isGroqModel(modelId) && !isGeminiModel(modelId);
  if (mode === "text" || !spec) {
    return { mode: "text", extras: {} };
  }
  if (mode === "schema_strict") {
    return {
      mode,
      responseFormat: {
        type: "json_schema",
        json_schema: { name: spec.name, strict: true, schema: spec.schema },
      },
      extras: isOpenRouter
        ? { provider: { require_parameters: true }, plugins: [{ id: "response-healing" }] }
        : {},
    };
  }
  return {
    mode,
    responseFormat: { type: "json_object" },
    extras: isOpenRouter
      ? { provider: { require_parameters: true }, plugins: [{ id: "response-healing" }] }
      : {},
  };
}

/**
 * true si el error significa "el modelo no produjo JSON válido para el modo/esquema".
 * Firma real de Groq/OpenRouter: 400 con `json_validate_failed` /
 * "Failed to validate JSON" / "does not match the expected schema".
 */
export function isJsonModeFailure(status: number, bodyText: string): boolean {
  if (status !== 400 && status !== 422) return false;
  return /json_validate_failed|Failed to validate JSON|Failed to generate JSON|does not match the expected schema/i.test(
    bodyText
  );
}

/** Marca un modo como no fiable para un modelo (se baja la escalera). */
export function markModeUnreliable(modelId: string, mode: JsonMode): void {
  if (mode === "text") return;
  const set = unreliable.get(modelId) ?? new Set<JsonMode>();
  set.add(mode);
  unreliable.set(modelId, set);
  console.log(
    `[STRUCTURED] ${modelId}: modo ${mode} no fiable (400 JSON). Siguiente intento baja de modo.`
  );
}

export type StructuredScope = "router" | "scripts";

/**
 * Flag de despliegue: ACS_STRUCTURED_OUTPUTS = off | router | scripts | all.
 * Default `all`; `off` restaura exactamente el comportamiento anterior (prompt +
 * regex, sin response_format) sin redeploy de código.
 */
export function structuredOutputsEnabled(scope: StructuredScope): boolean {
  const raw = (process.env.ACS_STRUCTURED_OUTPUTS ?? "all").trim().toLowerCase();
  if (raw === "off") return false;
  if (raw === "all") return true;
  return raw === scope;
}
