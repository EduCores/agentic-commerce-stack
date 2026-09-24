import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";

/**
 * Elimina ruido de menús del markdown de Jina: descarta líneas que son (casi)
 * solo enlaces — típico de los menús de categorías de PrestaShop (~50k chars
 * antes del contenido real). Así el snippet apunta al contenido útil.
 */
function stripLinkHeavyLines(markdown: string): string {
  const out: string[] = [];
  let skipIndent = -1; // ≥0: se están descartando las continuaciones del enlace descartado
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      if (out.length > 0 && out[out.length - 1] !== "") out.push("");
      continue;
    }
    const indent = line.length - line.trimStart().length;
    if (skipIndent >= 0) {
      if (indent > skipIndent) continue; // continuación (p.ej. descripción del menú)
      skipIndent = -1;
    }
    const trimmed = line.trim();
    const withoutLinks = trimmed.replace(/!?\[[^\]]*\]\([^)]*\)/g, "").trim();
    const hasLinks = withoutLinks.length !== trimmed.length;
    // Línea que queda vacía o casi vacía al quitar enlaces => es un enlace del menú;
    // sus continuaciones (descripción del título) también se descartan.
    if (hasLinks && withoutLinks.length < 24 && withoutLinks.length < trimmed.length * 0.4) {
      skipIndent = indent;
      continue;
    }
    out.push(line);
  }
  return out.join("\n").trim();
}

/** Primera aparición de la query completa o de alguna palabra significativa (≥4). */
function findQueryAnchor(text: string, query: string): number {
  const lower = text.toLowerCase();
  const q = query.trim().toLowerCase();
  if (q) {
    const direct = lower.indexOf(q);
    if (direct !== -1) return direct;
  }
  let best = -1;
  for (const word of q.split(/[^a-záéíóúñü0-9]+/i)) {
    if (word.length < 4) continue;
    const i = lower.indexOf(word);
    if (i !== -1 && (best === -1 || i < best)) best = i;
  }
  return best;
}

/**
 * Scrape Website Tool — ACS
 * Extrae contenido de una URL para comparar precios, políticas o fichas.
 * Usa Jina Reader (https://cc.jina.ai) como proxy de extracción + fallback a fetch directo.
 * En Vercel sin JINA_API_KEY funciona igual (modo anon limitado).
 */
export default defineTool({
  description:
    "Extrae el contenido textual de una URL externa (ficha de producto, política de envíos, etc.) para comparar precios o resolver consultas generales. Devuelve texto limpio y metadatos.",
  inputSchema: z.object({
    url: z.string().url().describe("URL a scrapear (https://...)"),
    query: z.string().optional().describe("Pregunta para enfocar la extracción (ej: precio, política de devolución)"),
    maxChars: z.number().min(500).max(8000).default(4000).describe("Límite de caracteres del texto devuelto"),
  }),
  async execute({ url, query, maxChars }) {
    const jinaKey = process.env.JINA_API_KEY;
    const target = url.trim();
    let text = "";
    let source: "jina" | "direct" = "jina";
    let status = 0;

    // 1) Intenta Jina Reader (convierte HTML→Markdown limpio).
    //    Endpoint vigente: r.jina.ai (cc.jina.ai quedó muerto: DNS/000).
    try {
      const jinaUrl = `https://r.jina.ai/${target}`;
      const headers: Record<string, string> = {
        Accept: "text/markdown",
        "X-Retain-Images": "none",
      };
      if (jinaKey) headers["Authorization"] = `Bearer ${jinaKey}`;
      if (query) headers["X-Target-Selector"] = "body";
      const r = await fetch(jinaUrl, { headers, signal: AbortSignal.timeout(12000) });
      status = r.status;
      if (r.ok) {
        const body = await r.text();
        // Jina responde 200 aunque el destino sea 404/500: lo avisa en el cuerpo.
        // Si el destino falló, se pasa al fetch directo para que su status real
        // (4xx/5xx) se reporte como error y el modelo no use una página falsa.
        const upstream = body.match(/Target URL returned error (\d{3})/i);
        if (upstream) {
          status = Number(upstream[1]);
          source = "direct";
        } else {
          text = body;
        }
      } else {
        source = "direct";
      }
    } catch {
      source = "direct";
    }

    // 2) Fallback: fetch directo y strip HTML básico
    if (!text || source === "direct") {
      try {
        const r2 = await fetch(target, {
          headers: { "User-Agent": "ACS-StarShop-Bot/1.0" },
          signal: AbortSignal.timeout(10000),
        });
        status = r2.status;
        // 4xx/5xx: devolver error explícito en vez del HTML de la página de error.
        // (Antes el modelo recibía el shell del 404 —~8k chars— como si fuera la
        // política real y respondía con datos inventados.)
        if (r2.status >= 400) {
          return {
            ok: false,
            url: target,
            source: "direct",
            status: r2.status,
            error: `HTTP ${r2.status} al descargar la URL`,
            hint: "La URL no existe o no es accesible. No la uses como fuente: verifica la URL correcta o responde sin inventar.",
          };
        }
        const html = await r2.text();
        // strip tags simple (sin dependencias)
        text = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        source = "direct";
      } catch (e) {
        return {
          ok: false,
          url: target,
          error: e instanceof Error ? e.message : String(e),
          hint: "No se pudo scrapear la URL. Verifica que sea pública y accesible.",
        };
      }
    }

    // El markdown de Jina arrastra menús (PrestaShop: lista de categorías enorme):
    // se limpian para que quede el contenido real.
    if (source === "jina") text = stripLinkHeavyLines(text);

    const sliced = text.slice(0, maxChars);
    // Si hay query, prioriza el snippet alrededor del término buscado (frase
    // completa o, si no aparece, su palabra significativa más temprana).
    let snippet = sliced;
    if (query && text.length > maxChars) {
      const idx = findQueryAnchor(text, query);
      if (idx !== -1) {
        const start = Math.max(0, idx - 800);
        snippet = text.slice(start, start + maxChars);
      }
    }

    return {
      ok: true,
      url: target,
      source,
      status,
      chars: text.length,
      truncated: text.length > maxChars,
      content: snippet,
      query: query ?? null,
    };
  },
});
