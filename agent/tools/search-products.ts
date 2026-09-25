import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";
import { getStoreAdapterForStore } from "@/lib/adapters/store";
import { prisma } from "@/lib/adapters/prisma";
import { cleanProductQuery, normalize } from "../lib/search/normalize";
import { resolveProductImage } from "@/utils/product-image";
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

    // Query limpia determinística ("tienes alicates?" → "alicates"): el agente
    // DEBE usar cleanQuery para navigateTo y para mencionar el producto.
    const clean = cleanProductQuery(query);

    // Charla/saludo sin producto objetivo ("estamos de vuelta?", "hola"):
    // no se busca nada y se le indica al agente que responda conversando.
    if (!clean) {
      return {
        query: normalize(query),
        cleanQuery: "",
        expandedTerms: [],
        found: 0,
        products: [],
        categorySuggestions: allCategories(),
        noResults: true,
        notAProductQuery: true,
        message:
          "La consulta no nombra ningún producto (parece saludo o charla). No busques ni navegues: responde conversando y pregunta qué producto necesita.",
      };
    }

    const ranked = rankProducts(products, clean);
    const rawText = normalize(clean);
    const matched = matchCategories(rawText, ranked.tokens);

    const hits = ranked.hits.slice(0, limit);
    // Guardia de confianza: si el mejor calza débil o empata con el segundo,
    // el agente debe preguntar en vez de navegar al primero a ciegas.
    const top1 = ranked.hits[0];
    const top2 = ranked.hits[1];
    const uncertain = !top1 || top1.score < 25 || (top2 !== undefined && top1.score - top2.score < 8);
    // Enriquece con imagen real desde Prisma (best-effort: el mock puede no estar en BD).
    const dbMeta = await prisma.product
      .findMany({
        where: { storeId: sid, sku: { in: hits.map((h) => h.product.sku) } },
        select: { sku: true, images: true },
      })
      .catch(() => []);
    const imgOf = (sku: string) => resolveProductImage(dbMeta.find((p) => p.sku === sku)?.images);
    const productsOut = hits.map((hit) => {
      const meta = (hit.product.metadata ?? {}) as Record<string, unknown>;
      return {
        sku: hit.product.sku,
        title: hit.product.title,
        description: hit.product.description ?? "",
        price: hit.product.price,
        currency: hit.product.currency ?? "CLP",
        stock: hit.product.stock,
        image: imgOf(hit.product.sku),
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
      cleanQuery: clean,
      expandedTerms: ranked.expandedTerms,
      found: productsOut.length,
      products: productsOut,
      categorySuggestions,
      noResults: productsOut.length === 0,
      notAProductQuery: false,
      uncertain,
      message:
        productsOut.length === 0
          ? `No encontramos productos para "${query}". Puedes revisar estas categorías: ${categorySuggestions.map((c) => c.name).join(", ")}.`
          : uncertain
            ? `Coincidencia débil para "${query}": NO navegues directo a un producto. Muestra estas opciones al cliente y pregúntale cuál necesita.`
            : `${productsOut.length} producto(s) encontrado(s). Si quieres verlos en la tienda, navega a la categoría sugerida.`,
    };
  },
});
