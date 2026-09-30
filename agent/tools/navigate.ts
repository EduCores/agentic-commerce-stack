import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";

/** Prefijos de ruta que el agente puede abrir en la tienda. */
const ALLOWED_PATH_PREFIXES = [
  "/busqueda",
  "/producto/",
  "/categoria/",
  "/checkout",
  "/cotizacion",
  "/carrito",
  "/ofertas",
  "/destacados",
];

/**
 * Solo rutas RELATIVAS de la tienda. Bloquea URLs externas, `javascript:`, `//host`,
 * backslashes y caracteres de control: los consumidores hacen `window.location.href =
 * <ruta>` (widget StarShop y chat del dashboard), así que sin esta puerta el modelo
 * —o una inyección de prompt— podía convertir el chat en un open redirect.
 * Devuelve null si la ruta no es admisible.
 */
export function sanitizePath(raw: string): string | null {
  const p = raw.trim();
  if (!p.startsWith("/") || p.startsWith("//") || p.includes("\\")) return null;
  if (/[\u0000-\u001f\u007f\s]/.test(p)) return null;
  const [pathPart, queryPart] = p.split("?", 2);
  if (queryPart !== undefined && /[<>"'`\\]/.test(queryPart)) return null;
  const ok = ALLOWED_PATH_PREFIXES.some((pre) => (pre.endsWith("/") ? pathPart.startsWith(pre) : pathPart === pre));
  return ok ? p : null;
}

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
    const cleanPath = sanitizePath(path ?? "");
    if (!cleanPath) {
      return {
        navigateTo: "",
        blocked: true,
        message: `Ruta no permitida: ${path}. Solo se puede navegar dentro de la tienda (/busqueda, /producto/, /categoria/, /checkout, /cotizacion).`,
      };
    }
    // Búsqueda genérica -> ventana de resultados global /busqueda?q= (la página de categoría
    // no filtra por query, así que NUNCA usar ?search= sobre /categoria)
    if (cleanPath === "/busqueda" || cleanPath.startsWith("/busqueda?")) {
      const q = (query ?? "").trim();
      const finalPath = q ? `/busqueda?q=${encodeURIComponent(q)}` : "/busqueda";
      return { navigateTo: finalPath, message: `Abriendo resultados de búsqueda para "${q}"` };
    }
    if (query && !cleanPath.startsWith("/producto/")) {
      const finalPath = `/busqueda?q=${encodeURIComponent(query)}`;
      return { navigateTo: finalPath, message: `Abriendo resultados de búsqueda para "${query}"` };
    }
    return { navigateTo: cleanPath, message: `Navegando a ${cleanPath}` };
  },
});
