/**
 * Retrieval RAG de políticas — Fase 2 del harness.
 *
 * POR QUÉ: las respuestas de políticas (despachos, garantías, B2B, compra)
 * salían de la memoria del modelo. Este módulo consulta el corpus canónico
 * versionado (docs/policies/*.md → data/docs-embeddings.json vía
 * scripts/ingest-docs.ts): vector search (top-20) + rerank léxico con
 * sinónimos (top-3). Híbrido 0.6/0.4 como el RAG de StarShop. Sin API key o
 * sin archivo de vectores degrada a léxico puro (modo reportado, nunca falla).
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { meaningfulTokens, normalize } from "./normalize";
import { expandTerms } from "./synonyms";

export type DocChunk = {
  id: string;
  doc: string;
  title: string;
  text: string;
  embedding: number[];
  hash?: string;
};

export type DocHit = {
  title: string;
  text: string;
  score: number;
  source: string;
  mode: "hybrid" | "lexical" | "empty";
};

/** Chunking semántico por encabezados (no corta ideas por la mitad). */
export function chunkMarkdown(doc: string, raw: string): Array<{ title: string; text: string }> {
  const chunks: Array<{ title: string; text: string }> = [];
  const lines = raw.split(/\r?\n/);
  let docTitle = doc;
  let section = "";
  let buf: string[] = [];
  const flush = () => {
    const text = buf.join("\n").trim();
    if (text) {
      chunks.push({
        title: `${docTitle}${section ? ` — ${section}` : ""}`,
        text: `${docTitle}${section ? `\n${section}` : ""}\n${text}`.trim(),
      });
    }
    buf = [];
  };
  for (const line of lines) {
    if (/^<!--/.test(line.trim())) continue;
    const h1 = line.match(/^#\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    if (h1 && !line.startsWith("##")) {
      flush();
      docTitle = h1[1].trim();
      section = "";
      continue;
    }
    if (h2) {
      flush();
      section = h2[1].trim();
      continue;
    }
    buf.push(line);
  }
  flush();
  return chunks.filter((c) => c.text.length > 0);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

let indexCache: DocChunk[] | null = null;
let indexModel = "";

export function loadDocsIndex(): DocChunk[] {
  if (indexCache) return indexCache;
  const file = join(process.cwd(), "data", "docs-embeddings.json");
  if (!existsSync(file)) {
    indexCache = [];
    return indexCache;
  }
  try {
    const j = JSON.parse(readFileSync(file, "utf8")) as DocChunk[] | { model?: string; chunks?: DocChunk[] };
    const chunks = Array.isArray(j) ? j : (j.chunks ?? []);
    // Formato legado (array puro): vectores openai/text-embedding-3-small.
    indexModel = Array.isArray(j) ? "openai/text-embedding-3-small" : (j.model ?? "");
    indexCache = chunks.filter((c) => c && typeof c.text === "string");
  } catch {
    indexCache = [];
  }
  return indexCache;
}

/** Modelo con que se embedió el índice ("" si no hay índice). */
export function docsIndexModel(): string {
  loadDocsIndex();
  return indexModel;
}

/** Solo para tests: permite inyectar un índice en memoria. */
export function setDocsIndexForTests(chunks: DocChunk[]): void {
  indexCache = chunks;
}

/** Score léxico con sinónimos (mismo vocabulario que el ranker de productos). */
export function lexicalScore(query: string, title: string, text: string): number {
  const tokens = meaningfulTokens(query);
  if (tokens.length === 0 && !normalize(query)) return 0;
  const expanded = expandTerms(tokens);
  const t = normalize(`${title} ${title}`);
  const b = normalize(text);
  let score = 0;
  for (const term of new Set(expanded)) {
    if (term.length < 3) continue;
    if (t.includes(term)) score += 3;
    if (b.includes(term)) score += 1;
  }
  const raw = normalize(query);
  if (raw.length >= 4 && b.includes(raw)) score += 4;
  return score;
}

export async function embedQuery(
  text: string,
  fetcher: typeof fetch = fetch,
): Promise<{ vec: number[]; model: string } | null> {
  const input = text.slice(0, 2000);
  // OpenRouter primero; ante 402/429/red, Gemini gratis (misma cascada que la ingesta).
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (apiKey) {
      const model = process.env.OPENROUTER_EMBED_MODEL || "openai/text-embedding-3-small";
      const r = await fetcher("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002",
          "X-Title": "ACS Docs Search",
        },
        body: JSON.stringify({ model, input }),
        signal: AbortSignal.timeout(20000),
      });
      if (r.ok) {
        const j = await r.json();
        const vec = j?.data?.[0]?.embedding;
        if (Array.isArray(vec)) return { vec, model };
      }
    }
  } catch {}
  try {
    const gKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!gKey) return null;
    const r = await fetcher(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${gKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { parts: [{ text: input }] } }),
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!r.ok) return null;
    const j = await r.json();
    const vec = j?.embedding?.values;
    if (Array.isArray(vec)) return { vec, model: "gemini-embedding-001" };
  } catch {}
  return null;
}

export async function searchDocs(
  query: string,
  k = 3,
  opts?: { queryVector?: number[] | null; queryModel?: string; fetcher?: typeof fetch },
): Promise<DocHit[]> {
  const chunks = loadDocsIndex();
  if (chunks.length === 0) return [];
  const eq = opts?.queryVector
    ? { vec: opts.queryVector, model: opts.queryModel ?? docsIndexModel() }
    : await embedQuery(query, opts?.fetcher);
  // Etapa 1 (vectorial): top-20 por coseno. Sin vector, o con modelo distinto
  // al del índice (vectores incomparables), se degrada a léxico puro.
  let candidates = chunks.map((c, i) => ({ c, i, cos: 0 }));
  let mode: DocHit["mode"] = "lexical";
  const qv = eq?.vec && (!eq.model || !docsIndexModel() || eq.model === docsIndexModel()) ? eq.vec : null;
  if (qv && qv.length > 0) {
    candidates = chunks
      .map((c, i) => ({ c, i, cos: Array.isArray(c.embedding) ? cosine(qv, c.embedding) : -1 }))
      .sort((a, b) => b.cos - a.cos)
      .slice(0, 20);
    mode = "hybrid";
  }
  // Etapa 2 (rerank léxico): reordena los candidatos con vocabulario del dominio.
  const scored = candidates.map(({ c, cos }) => ({ c, cos, lex: lexicalScore(query, c.title, c.text) }));
  const maxLex = Math.max(...scored.map((s) => s.lex), 1);
  return scored
    .map((s) => ({
      title: s.c.title,
      text: s.c.text,
      score: mode === "hybrid" ? 0.6 * s.cos + 0.4 * (s.lex / maxLex) : s.lex,
      source: s.c.doc,
      mode,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
