/**
 * Grafo como fuente de configuración del router (Fase 1).
 * Lee WorkflowDefinition "starshop-router" y extrae overrides por intent:
 *   { prompt?, model?, tools? } desde data de los nodos crew.
 *
 * Seguridad (por qué valida tanto):
 * - model: solo se acepta si está en allowlist (evita modelos inexistentes que
 *   romperían el chat en producción por un typo en el editor).
 * - tools: se filtra contra el registry real de tools; si queda vacío → no override.
 * - prompt: solo strings largos (>40 chars) para no tomar un título por prompt.
 *
 * Cualquier problema (BD caída, grafo malformado) → devuelve null y el caller
 * usa la config del código. El agente NUNCA se queda sin configuración.
 */
import { prisma } from "@/lib/adapters/prisma";
import { STARSHOP_INTENTS, type StarShopIntent } from "../../prisma/starshop-prompts";

export type GraphCrewOverride = {
  prompt?: string;
  model?: string;
  tools?: string[];
};

/**
 * Slug del WorkflowDefinition que gobierna el router del agente.
 * Debe coincidir con el sembrado en prisma/seed.ts y con src/workflows/starshop-router.ts.
 */
export const ROUTER_SLUG = "starshop-intent-router";

const CACHE_TTL_MS = 60_000;
const cache: { at: number; map: Partial<Record<StarShopIntent, GraphCrewOverride>> | null } = { at: 0, map: null };

export function clearCrewGraphCache() {
  cache.at = 0;
  cache.map = null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function loadOverrides(knownTools: string[], allowedModels: string[]): Promise<Partial<Record<StarShopIntent, GraphCrewOverride>> | null> {
  const def = await prisma.workflowDefinition.findUnique({ where: { slug: ROUTER_SLUG } });
  if (!def || !isRecord(def.graph)) return null;
  // Solo el grafo PUBLICADO (isActive) configura al agente: "Despublicar" en /workflows
  // devuelve el control a la config del codigo sin borrar nada.
  if (!def.isActive) return null;

  const nodes = (def.graph as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes)) return null;

  const map: Partial<Record<StarShopIntent, GraphCrewOverride>> = {};
  for (const raw of nodes) {
    if (!isRecord(raw) || !isRecord(raw.data)) continue;
    const data = raw.data as Record<string, unknown>;
    const intent = data.intent;
    // Solo nodos con UN intent válido (excluye "product_search/checkout" del validate transversal)
    if (typeof intent !== "string" || !(STARSHOP_INTENTS as readonly string[]).includes(intent)) continue;

    const ov: GraphCrewOverride = {};

    if (typeof data.prompt === "string" && data.prompt.trim().length > 40) {
      ov.prompt = data.prompt;
    }
    if (typeof data.model === "string" && allowedModels.includes(data.model.trim())) {
      ov.model = data.model.trim();
    }
    if (Array.isArray(data.tools)) {
      const valid = data.tools.filter((t): t is string => typeof t === "string" && knownTools.includes(t));
      if (valid.length > 0) ov.tools = valid;
    }

    if (ov.prompt || ov.model || ov.tools) map[intent as StarShopIntent] = ov;
  }
  return map;
}

/** Overrides desde el grafo, con cache de 60s. null = usar config del código. */
export async function getGraphCrewOverrides(
  knownTools: string[],
  allowedModels: string[],
): Promise<Partial<Record<StarShopIntent, GraphCrewOverride>> | null> {
  if (Date.now() - cache.at < CACHE_TTL_MS) return cache.map;
  try {
    const map = await loadOverrides(knownTools, allowedModels);
    cache.at = Date.now();
    cache.map = map;
    return map;
  } catch (e) {
    console.log("[CREW-GRAPH] Grafo no disponible, usando config del código:", e instanceof Error ? e.message : e);
    cache.at = Date.now();
    cache.map = null;
    return null;
  }
}
