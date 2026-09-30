/**
 * Ingesta RAG de políticas — Fase 2 del harness (`npm run acs:ingest-docs`).
 *
 * POR QUÉ: las respuestas de políticas (despachos, garantías, B2B) hoy salen
 * del prompt de memoria del modelo. Este script versiona el corpus canónico
 * (docs/policies/*.md, con números espejados de las tools) y genera
 * data/docs-embeddings.json: [{id, doc, title, text, embedding}].
 * Chunking semántico por encabezados ## (no corta ideas por la mitad).
 * Re-embebe SOLO chunks cuyo hash cambió (cuota: ~1 request por chunk nuevo).
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { chunkMarkdown, type DocChunk } from "../agent/lib/search/docs-retrieval";

function loadEnv() {
  try {
    for (const raw of readFileSync(join(process.cwd(), ".env"), "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {}
}
loadEnv();

const POLICIES_DIR = join(process.cwd(), "docs", "policies");
const OUT_FILE = join(process.cwd(), "data", "docs-embeddings.json");
const EMBED_MODEL = process.env.OPENROUTER_EMBED_MODEL || "openai/text-embedding-3-small";

async function embedOpenRouter(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const r = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002",
      "X-Title": "ACS Docs Ingest",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) {
    console.log(`[ingest] OpenRouter embeddings HTTP ${r.status}, probando Gemini`);
    return null;
  }
  const j = await r.json();
  const vec = j?.data?.[0]?.embedding;
  return Array.isArray(vec) ? vec : null;
}

async function embedGemini(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!r.ok) {
    console.log(`[ingest] Gemini embeddings HTTP ${r.status}`);
    return null;
  }
  const j = await r.json();
  const vec = j?.embedding?.values;
  return Array.isArray(vec) ? vec : null;
}

async function embed(texts: string[]): Promise<{ vectors: number[][]; model: string }> {
  // OpenRouter primero; si falla (402 sin créditos, 429, red), Gemini gratis.
  // Todo el índice usa UN solo modelo (los vectores no son comparables entre modelos).
  const out: number[][] = [];
  let model = EMBED_MODEL;
  let useGemini = false;
  for (const text of texts) {
    let vec: number[] | null = null;
    if (!useGemini) {
      vec = await embedOpenRouter(text).catch(() => null);
      if (!vec && (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) useGemini = true;
    }
    if (!vec && useGemini) {
      vec = await embedGemini(text).catch(() => null);
      if (vec) model = "gemini-embedding-001";
    }
    if (!vec) throw new Error("sin proveedor de embeddings disponible (OPENROUTER_API_KEY sin créditos y sin GEMINI_API_KEY)");
    out.push(vec);
    await new Promise((res) => setTimeout(res, 400));
  }
  return { vectors: out, model };
}

async function main() {
  const files = readdirSync(POLICIES_DIR).filter((f) => f.endsWith(".md")).sort();
  if (files.length === 0) throw new Error(`sin .md en ${POLICIES_DIR}`);
  let prev: DocChunk[] = [];
  let prevModel = "";
  if (existsSync(OUT_FILE)) {
    try {
      const raw = JSON.parse(readFileSync(OUT_FILE, "utf8")) as DocChunk[] | { model?: string; chunks?: DocChunk[] };
      if (Array.isArray(raw)) prev = raw;
      else {
        prev = raw.chunks ?? [];
        prevModel = raw.model ?? "";
      }
    } catch {}
  }
  const prevById = new Map(prev.map((c) => [c.id, c]));
  const all: Array<{ id: string; doc: string; title: string; text: string; hash: string }> = [];
  for (const f of files) {
    const raw = readFileSync(join(POLICIES_DIR, f), "utf8");
    for (const c of chunkMarkdown(f, raw)) {
      const hash = createHash("sha1").update(c.text).digest("hex").slice(0, 12);
      all.push({ id: `${f}#${hash}`, doc: f, title: c.title, text: c.text, hash });
    }
  }
  const needEmbed = all.filter((c) => !prevById.get(c.id)?.embedding?.length);
  const cached = all.filter((c) => prevById.get(c.id)?.embedding?.length);
  console.log(`chunks: ${all.length} (${cached.length} cacheados, ${needEmbed.length} nuevos)`);
  // Nota: id incluye el hash => chunk modificado = id nuevo = se embebe; el viejo se descarta.
  const { vectors, model } =
    needEmbed.length > 0 ? await embed(needEmbed.map((c) => c.text)) : { vectors: [] as number[][], model: prevModel || EMBED_MODEL };
  if (prev.length > 0 && prevModel && model !== prevModel) {
    throw new Error(`modelo de embeddings cambió (${prevModel} → ${model}): borra ${OUT_FILE} y re-ingesta completo`);
  }
  const result: DocChunk[] = all.map((c) => {
    const old = prevById.get(c.id);
    if (old?.embedding?.length) return old;
    const vec = vectors[needEmbed.indexOf(c)];
    if (!vec) throw new Error(`sin embedding para ${c.id}`);
    return { ...c, embedding: vec };
  });
  const payload = JSON.stringify({ model, dim: result[0]?.embedding.length ?? 0, chunks: result });
  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  writeFileSync(OUT_FILE, payload);
  console.log(`OK: ${result.length} chunks [${model}] → ${OUT_FILE} (${(payload.length / 1024).toFixed(0)} KB)`);
}

main().catch((e) => {
  console.error("INGEST FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
