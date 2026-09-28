/**
 * Enriquecimiento automático del catálogo (Fase 2+A).
 *
 * Cuando los productos vienen del cliente sin detalle, el agente genera
 * descripción + aliases + tags desde el título/SKU/categoría (y, si el
 * producto trae `metadata.sourceUrl`, complementa scrapeando esa URL).
 * Los aliases alimentan DIRECTO el ranking de searchProducts, así el
 * producto se vuelve encontrable en cualquier escenario.
 *
 * Uso:
 *   npx tsx scripts/enrich-catalog.ts               (dry-run, muestra plan)
 *   npx tsx scripts/enrich-catalog.ts --apply       (escribe en BD)
 *   npx tsx scripts/enrich-catalog.ts --apply --limit 10 --model <id>
 */
import "dotenv/config";
import { prisma } from "../src/lib/adapters/prisma";
import { resolveModel, headersFor, filterResolvable } from "../agent/lib/model-provider";
import {
  buildAttempt,
  isJsonModeFailure,
  markModeUnreliable,
  modesFor,
  structuredOutputsEnabled,
  type JsonMode,
  type JsonSchemaSpec,
} from "../agent/lib/structured-output";

const MODEL = process.argv.find((a) => a.startsWith("--model="))?.split("=")[1]
  ?? "nvidia/nemotron-3.5-lightning:free";
const APPLY = process.argv.includes("--apply");
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 50);

type Enrichment = { description: string; aliases: string[]; tags: string[] };

/**
 * Esquema del enriquecimiento para los modos estructurados
 * (`additionalProperties: false` + todo en `required`, como exige strict).
 */
const ENRICHMENT_SCHEMA: JsonSchemaSpec = {
  name: "starshop_enrichment",
  schema: {
    type: "object",
    properties: {
      description: {
        type: "string",
        description: "1-2 líneas en español chileno: qué es + uso principal",
      },
      aliases: {
        type: "array",
        description:
          "6-10 formas en que un cliente lo buscaría: sinónimos, coloquialismos, plurales, con/sin marca",
        items: { type: "string" },
      },
      tags: {
        type: "array",
        description: "3-5 tags: uso, lugar (exterior/interior), rubro",
        items: { type: "string" },
      },
    },
    required: ["description", "aliases", "tags"],
    additionalProperties: false,
  },
};

/** Recorta y valida el JSON del enriquecimiento (los :free suelen envolverlo en texto). */
function parseEnrichment(raw: string): Enrichment | null {
  const cleaned = raw.replace(/```json|```/g, "");
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s < 0 || e <= s) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(s, e + 1)) as Partial<Enrichment>;
    if (typeof parsed.description !== "string" || !Array.isArray(parsed.aliases)) return null;
    return {
      description: parsed.description.slice(0, 500),
      aliases: [
        ...new Set(
          parsed.aliases
            .filter((a) => typeof a === "string")
            .map((a) => a.trim())
            .filter(Boolean)
        ),
      ].slice(0, 12),
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((t) => typeof t === "string").slice(0, 6)
        : [],
    };
  } catch {
    return null;
  }
}

async function enrichOne(title: string, sku: string, category: string, current: string, sourceUrl?: string): Promise<Enrichment | null> {
  const extra = sourceUrl ? `\nFicha de referencia (puede estar vacía): ${sourceUrl}` : "";
  const userMsg = `Producto: "${title}" (SKU ${sku}, categoría ${category || "general"}). Descripción actual: "${current || "(vacía)"}".${extra}\n\nDevuelve SOLO el objeto JSON, sin explicaciones ni razonamiento previo: {"description": "1-2 líneas en español chileno, qué es + uso principal", "aliases": ["6-10 formas en que un cliente lo buscaría: sinónimos, coloquialismos (toma corriente, tomacorriente...), plurales, con/sin marca"], "tags": ["3-5 tags: uso, lugar (exterior/interior), rubro"]}`;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const e = await tryEnrich(userMsg);
    if (e) return e;
    console.log(`  reintento ${attempt}/2...`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

// Cadena de respaldo del agente (Groq primero → pagados → free de OpenRouter).
// Reusa el multi-provider de agent/lib/model-provider.ts (misma mecánica que runAgent).
const EXTRA_FALLBACKS = [
  "groq/qwen/qwen3.8-27b",
  "groq/openai/gpt-oss-120b",
  "groq/openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3-30b-a3b-instruct-2507",
  "meta-llama/llama-3.3-70b-instruct",
  "openai/gpt-4o-mini",
  "google/gemini-2.5-flash",
  "qwen/qwen3.8-27b:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3.5-lightning:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
] as const;

const CHAIN = filterResolvable([MODEL, ...EXTRA_FALLBACKS]);

async function tryEnrich(userMsg: string): Promise<Enrichment | null> {
  for (const id of CHAIN) {
    const r = resolveModel(id);
    if (!r) continue;
    // Escalera por modelo: modo verificado → json_object → texto+regex. Un 400 de
    // validación JSON baja de modo ANTES de descartar el modelo (no se pierde una
    // respuesta útil por exigir un formato que ese modelo no domina).
    const modes: JsonMode[] = structuredOutputsEnabled("scripts") ? modesFor(id) : ["text"];
    for (const mode of modes) {
      const attempt = buildAttempt(id, mode, ENRICHMENT_SCHEMA);
      const body = {
        model: r.upstreamId,
        messages: [
          {
            role: "system",
            content: "Eres un catalogador experto de ferretería chilena (StarShop). Respondes SOLO JSON válido.",
          },
          { role: "user", content: userMsg },
        ],
        ...(attempt.responseFormat ? { response_format: attempt.responseFormat } : {}),
        ...attempt.extras,
      };
      let resp: Response | null = null;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 45000);
      try {
        resp = await fetch(`${r.baseURL}/chat/completions`, {
          method: "POST",
          headers: headersFor(r),
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
      } catch {
        resp = null;
      } finally {
        clearTimeout(t);
      }
      if (!resp) {
        console.log(`  ${id}: red`);
        break; // siguiente modelo
      }
      if (!resp.ok) {
        const detail = await resp.text().catch(() => "");
        if (isJsonModeFailure(resp.status, detail)) {
          markModeUnreliable(id, mode);
          console.log(`  ${id}: ${mode} rechazado (JSON), bajo de modo`);
          continue; // mismo modelo, siguiente modo
        }
        console.log(`  ${id}: HTTP ${resp.status}`);
        await new Promise((s) => setTimeout(s, 1500));
        break; // siguiente modelo
      }
      const j = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = j.choices?.[0]?.message?.content ?? "";
      const parsed = parseEnrichment(raw);
      if (!parsed) {
        console.log(`  ${id}: sin JSON válido en modo ${mode}`);
        continue; // mismo modelo, siguiente modo
      }
      console.log(`  ${id}: OK (modo ${mode})`);
      return parsed;
    }
  }
  return null;
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("Falta OPENROUTER_API_KEY");
  const products = await prisma.product.findMany({
    where: { storeId: "seed-store" },
    select: { id: true, sku: true, title: true, description: true, metadata: true },
    take: 200,
  });
  const pending = products.filter((p) => {
    const m = (p.metadata ?? {}) as Record<string, unknown>;
    return !p.description || !Array.isArray(m.aliases) || (m.aliases as unknown[]).length === 0;
  }).slice(0, LIMIT);
  console.log(`Productos pobres: ${pending.length}/${products.length} (modelo ${MODEL}, ${APPLY ? "APLICANDO" : "dry-run"})`);

  let ok = 0;
  for (const p of pending) {
    const m = (p.metadata ?? {}) as Record<string, unknown>;
    console.log(`- ${p.sku} "${p.title}"`);
    const e = await enrichOne(p.title, p.sku, String((m.categoria ?? m.category) ?? ""), p.description ?? "", typeof m.sourceUrl === "string" ? m.sourceUrl : undefined);
    if (!e) continue;
    console.log(`  desc: ${e.description.slice(0, 80)}... | aliases: ${e.aliases.slice(0, 5).join(", ")}...`);
    if (APPLY) {
      await prisma.product.update({
        where: { id: p.id },
        data: {
          description: p.description || e.description,
          metadata: { ...(m as object), aliases: e.aliases, tags: e.tags, enrichedAt: new Date().toISOString(), enrichedBy: MODEL },
        },
      });
      ok++;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.log(APPLY ? `Enriquecidos: ${ok}` : "Dry-run: nada escrito. Usa --apply para guardar.");
}

main().finally(() => prisma.$disconnect());
