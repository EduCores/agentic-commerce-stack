/**
 * Resolución multi-provider de modelos (OpenRouter + Groq + Google directo).
 *
 * POR QUÉ EXISTE: el free tier de OpenRouter tiene un tope de 50 requests/día
 * por cuenta (y 1.000 solo al comprar 10 créditos). Para demos y pruebas con
 * el cliente eso se agota en ~12 mensajes. Groq da 1.000 requests/día en su
 * plan gratuito, sin tarjeta ni créditos, y sirve `qwen/qwen3.8-27b` y
 * `openai/gpt-oss-120b` — los mismos modelos que usamos en OpenRouter.
 * Google AI Studio da cuota diaria gratuita real (sin tarjeta) para Gemini
 * Flash: es el tercer pilar gratuito de la cadena.
 *
 * CÓMO SE IDENTIFICAN: los modelos de Groq llevan el prefijo `groq/`
 * (ej: `groq/qwen/qwen3.8-27b`) y los directos de Google el prefijo `gemini/`
 * (ej: `gemini/gemini-2.0-flash`). Los de OpenRouter no llevan prefijo, así que
 * los ids existentes (`nvidia/nemotron-3-5-lightning:free`,
 * `google/gemini-2.5-flash`, etc.) no cambian.
 *
 * SIN PAQUETES NUEVOS: Groq y Google exponen APIs compatibles con OpenAI, y el
 * provider que ya tenemos (`@openrouter/ai-sdk-provider`) acepta `baseURL` +
 * `apiKey` propios, así que se reutiliza apuntándolo a cada endpoint.
 *
 * Si no hay GROQ_API_KEY / GEMINI_API_KEY, los modelos `groq/*` / `gemini/*`
 * se descartan de la cadena y el agente sigue funcionando igual que antes.
 */
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export type ProviderName = "openrouter" | "groq" | "google";

export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
/** Endpoint compatible con OpenAI de la API de Gemini (requiere GEMINI_API_KEY). */
export const GOOGLE_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

/** Prefijo que marca un modelo como servido por Groq. */
const GROQ_PREFIX = "groq/";

/**
 * Prefijo que marca un modelo como servido directo por Google (AI Studio).
 * OJO: NO se usa `google/` porque colisiona con los IDs de OpenRouter
 * (`google/gemini-2.5-flash` es un modelo de OpenRouter, no directo).
 * El upstream que espera la API de Gemini es `gemini-2.0-flash`, etc.
 */
const GEMINI_PREFIX = "gemini/";

export type ResolvedModel = {
  /** Id completo tal como aparece en la cadena (con prefijo si es groq). */
  id: string;
  provider: ProviderName;
  /** Id upstream sin prefijo, el que espera la API del proveedor. */
  upstreamId: string;
  baseURL: string;
  apiKey: string;
  /** Modelo sin coste por request (free tier de OpenRouter o plan free de Groq). */
  isFree: boolean;
};

const openrouterKey = () => process.env.OPENROUTER_API_KEY || "";
const groqKey = () => process.env.GROQ_API_KEY || "";
const adminKey = () => process.env.OPENROUTER_ADMIN_KEY || "";
/**
 * Key de Google AI Studio (`GEMINI_API_KEY`; se acepta `GOOGLE_API_KEY` como
 * alias por si la copiaste con ese nombre desde otro proyecto).
 */
const geminiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

/** ¿Hay credencial para este provider? Si no, sus modelos no se pueden usar. */
export function hasProviderKey(provider: ProviderName, isAdmin = false): boolean {
  if (provider === "groq") return Boolean(groqKey());
  if (provider === "google") return Boolean(geminiKey());
  return Boolean(isAdmin && adminKey() ? adminKey() : openrouterKey());
}

/** true si el id corresponde a un modelo servido por Groq. */
export function isGroqModel(id: string): boolean {
  return id.startsWith(GROQ_PREFIX);
}

/** true si el id corresponde a un modelo servido directo por Google. */
export function isGeminiModel(id: string): boolean {
  return id.startsWith(GEMINI_PREFIX);
}

/**
 * Un modelo es "free" si no cuesta por request: los `:free` de OpenRouter
 * (con tope de 50/día), TODO lo de Groq en plan gratuito (tope 1.000/día) y
 * TODO lo directo de Google con key de AI Studio (free tier sin tarjeta).
 */
export function isFreeModel(id: string): boolean {
  return id.endsWith(":free") || isGroqModel(id) || isGeminiModel(id);
}

/** Quita el prefijo `groq/` o `gemini/` si lo tiene. */
export function stripProviderPrefix(id: string): string {
  if (isGroqModel(id)) return id.slice(GROQ_PREFIX.length);
  if (isGeminiModel(id)) return id.slice(GEMINI_PREFIX.length);
  return id;
}

/**
 * Resuelve un id de modelo a provider + endpoint + credencial.
 * Devuelve null si el provider no tiene key configurada (se descarta el modelo).
 */
export function resolveModel(id: string, isAdmin = false): ResolvedModel | null {
  const provider: ProviderName = isGroqModel(id) ? "groq" : isGeminiModel(id) ? "google" : "openrouter";
  const apiKey =
    provider === "groq" ? groqKey() : provider === "google" ? geminiKey() : isAdmin && adminKey() ? adminKey() : openrouterKey();
  if (!apiKey) return null;
  return {
    id,
    provider,
    upstreamId: stripProviderPrefix(id),
    baseURL: provider === "groq" ? GROQ_BASE_URL : provider === "google" ? GOOGLE_BASE_URL : OPENROUTER_BASE_URL,
    apiKey,
    isFree: isFreeModel(id),
  };
}

/**
 * Filtra una cadena de modelos dejando solo los que se pueden resolver
 * (provider con key disponible). Sin esto, un `groq/*` sin GROQ_API_KEY
 * intentaría llamar a Groq y fallaría con 401 en cada request.
 */
export function filterResolvable(chain: string[], isAdmin = false): string[] {
  const usable = chain.filter((m) => resolveModel(m, isAdmin) !== null);
  return usable.length > 0 ? usable : chain;
}

/** Headers para las llamadas directas (fetch) a un provider. */
export function headersFor(resolved: ResolvedModel): Record<string, string> {
  const base: Record<string, string> = {
    Authorization: `Bearer ${resolved.apiKey}`,
    "Content-Type": "application/json",
  };
  // HTTP-Referer/X-Title son exclusivos de OpenRouter; Groq y Google los rechazan.
  if (resolved.provider === "openrouter") {
    base["HTTP-Referer"] = process.env.NEXT_PUBLIC_APP_URL || "https://agentic-commerce-stack.vercel.app";
    base["X-Title"] = "ACS Sales Agent";
  }
  return base;
}

// Un cliente por provider: Groq y Google reutilizan el provider de OpenRouter
// apuntando a su baseURL (APIs compatibles con OpenAI), sin paquetes extra.
let groqClient: ReturnType<typeof createOpenRouter> | null = null;
function getGroqClient() {
  if (!groqClient) {
    groqClient = createOpenRouter({ apiKey: groqKey(), baseURL: GROQ_BASE_URL });
  }
  return groqClient;
}

let googleClient: ReturnType<typeof createOpenRouter> | null = null;
function getGoogleClient() {
  if (!googleClient) {
    googleClient = createOpenRouter({ apiKey: geminiKey(), baseURL: GOOGLE_BASE_URL });
  }
  return googleClient;
}

let openrouterClient: ReturnType<typeof createOpenRouter> | null = null;
function getOpenRouterClient() {
  if (!openrouterClient) {
    openrouterClient = createOpenRouter({ apiKey: openrouterKey() });
  }
  return openrouterClient;
}

/**
 * Modelo del SDK `ai` listo para `generateText`/`streamText`, con tool-calling.
 * Groq y Google usan su propio cliente; OpenRouter respeta la key de admin si aplica.
 */
export function sdkModelFor(id: string, isAdmin = false) {
  if (isGroqModel(id)) {
    return getGroqClient().chat(stripProviderPrefix(id) as never) as never;
  }
  if (isGeminiModel(id)) {
    return getGoogleClient().chat(stripProviderPrefix(id) as never) as never;
  }
  const client = isAdmin && adminKey() ? createOpenRouter({ apiKey: adminKey() }) : getOpenRouterClient();
  return client.chat(id as never) as never;
}