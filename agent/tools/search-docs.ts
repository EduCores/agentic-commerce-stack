import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";
import { searchDocs } from "../lib/search/docs-retrieval";

/**
 * RAG de políticas — Fase 2 del harness.
 * Busca en el corpus canónico versionado (docs/policies/*.md): despachos,
 * garantías, B2B y compra. Híbrido vectorial+léxico con rerank; sin API key
 * o sin índice degrada a léxico puro (modo reportado, nunca falla).
 */
export default defineTool({
  description: "Busca en las políticas oficiales StarShop (despachos, garantías, devoluciones, B2B, compra). Úsala antes de responder de memoria.",
  inputSchema: z.object({
    query: z.string().describe("pregunta o tema de política a buscar"),
  }),
  async execute({ query }) {
    const hits = await searchDocs(query, 3);
    return {
      mode: hits[0]?.mode ?? "empty",
      results: hits.map((h) => ({
        title: h.title,
        text: h.text.slice(0, 900),
        score: Number(h.score.toFixed(3)),
        source: h.source,
      })),
    };
  },
});
