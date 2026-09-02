import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";
import { getStoreAdapterForStore } from "@/lib/adapters/store";
import { normalize } from "../lib/search/normalize";
import { rankProducts } from "../lib/search/rank";
import { matchCategories, allCategories } from "../lib/search/categories";
import type { CategorySuggestion } from "../lib/search/categories";

export default defineTool({
  description:
    "Busca productos por nombre, SKU, categoría o sinónimos. Tolera tildes, plurales y errores de tipeo. Devuelve resultados ordenados por relevancia y, si no hay coincidencias, sugiere categorías de la tienda. Usa storeId seed-store si no se especifica.",
  inputSchema: z.object({
    storeId: z.string().optional().default("seed-store"),
    query: z.string().min(1),
    limit: z.number().min(1).max(20).default(5),
  }),
  async execute({ storeId, query, limit }) {
    const sid = storeId ?? "seed-store";
    const { adapter } = await getStoreAdapterForStore(sid);
    const products = await adapter.listProducts(sid);

    const ranked = rankProducts(products, query);
    const rawText = normalize(query);
    const matched = matchCategories(rawText, ranked.tokens);

    const productsOut = ranked.hits.slice(0, limit).map((hit) => {
      const meta = (hit.product.metadata ?? {}) as Record<string, unknown>;
      return {
        sku: hit.product.sku,
        title: hit.product.title,
        description: hit.product.description ?? "",
        price: hit.product.price,
        currency: hit.product.currency ?? "CLP",
        stock: hit.product.stock,
        category: String(meta.categoria ?? ""),
        categorySlug: String(meta.categorySlug ?? ""),
        url: `/producto/${hit.product.sku}`,
        searchUrl: `/busqueda?q=${encodeURIComponent(rawText)}`,
      };
    });

    const categorySuggestions: CategorySuggestion[] =
      matched.length > 0 || productsOut.length > 0 ? matched : allCategories();

    return {
      query: rawText,
      expandedTerms: ranked.expandedTerms,
      found: productsOut.length,
      products: productsOut,
      categorySuggestions,
      noResults: productsOut.length === 0,
      message:
        productsOut.length === 0
          ? `No encontramos productos para "${query}". Puedes revisar estas categorías: ${categorySuggestions.map((c) => c.name).join(", ")}.`
          : `${productsOut.length} producto(s) encontrado(s). Si quieres verlos en la tienda, navega a la categoría sugerida.`,
    };
  },
});
