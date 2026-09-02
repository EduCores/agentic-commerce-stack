import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";

export default defineTool({
  description:
    "Navega a una página de la tienda StarShop. Para búsquedas genéricas (ej: \"taladro\", \"proyector led\") usa path=\"/busqueda\" con query: el usuario verá TODOS los productos coincidentes. Para una ficha específica usa path=\"/producto/<sku>\". Para explorar una categoría usa path=\"/categoria/<slug>\".",
  inputSchema: z.object({
    path: z
      .string()
      .describe("Ruta en StarShop: /busqueda (resultados globales), /producto/<sku> (ficha) o /categoria/<slug> (categoría)"),
    query: z.string().optional().describe("Término de búsqueda (requerido si path es /busqueda)"),
  }),
  async execute({ path, query }) {
    // Búsqueda genérica -> ventana de resultados global /busqueda?q= (la página de categoría
    // no filtra por query, así que NUNCA usar ?search= sobre /categoria)
    if (path === "/busqueda" || path.startsWith("/busqueda?")) {
      const q = (query ?? "").trim();
      const finalPath = q ? `/busqueda?q=${encodeURIComponent(q)}` : "/busqueda";
      return { navigateTo: finalPath, message: `Abriendo resultados de búsqueda para "${q}"` };
    }
    if (query && !path.startsWith("/producto/")) {
      const finalPath = `/busqueda?q=${encodeURIComponent(query)}`;
      return { navigateTo: finalPath, message: `Abriendo resultados de búsqueda para "${query}"` };
    }
    return { navigateTo: path, message: `Navegando a ${path}` };
  },
});
