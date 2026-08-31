import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";

export default defineTool({
  description: "Navega a una página de la tienda StarShop. Úsala después de searchProducts cuando el usuario quiera ver resultados en la grilla.",
  inputSchema: z.object({
    path: z.string().describe("Ruta en StarShop, ej: /categoria/iluminacion-led-neon, /producto/proyector-led-200w-ip66, /categoria/herramientas-maquinarias?search=taladro"),
    query: z.string().optional().describe("Término de búsqueda opcional"),
  }),
  async execute({ path, query }) {
    const finalPath = query ? `${path}${path.includes("?") ? "&" : "?"}search=${encodeURIComponent(query)}` : path;
    return { navigateTo: finalPath, message: `Navegando a ${finalPath}` };
  },
});
