import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";

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

    // 1) Intenta Jina Reader (convierte HTML→Markdown limpio)
    try {
      const jinaUrl = `https://cc.jina.ai/${target}`;
      const headers: Record<string, string> = {
        Accept: "text/markdown",
        "X-Retain-Images": "none",
      };
      if (jinaKey) headers["Authorization"] = `Bearer ${jinaKey}`;
      if (query) headers["X-Target-Selector"] = "body";
      const r = await fetch(jinaUrl, { headers, signal: AbortSignal.timeout(12000) });
      status = r.status;
      if (r.ok) {
        text = await r.text();
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

    const sliced = text.slice(0, maxChars);
    // Si hay query, prioriza snippet cercano a la query
    let snippet = sliced;
    if (query && text.length > maxChars) {
      const q = query.toLowerCase();
      const idx = text.toLowerCase().indexOf(q);
      if (idx !== -1) {
        const start = Math.max(0, idx - 1200);
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
