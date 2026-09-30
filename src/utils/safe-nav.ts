/**
 * Validación de la ruta que el agente devuelve en `navigateTo`.
 *
 * POR QUÉ EXISTE: el chat del dashboard hace `window.location.href = ruta` con lo que
 * devuelve el modelo. Sin esta puerta, una respuesta manipulada —o una página
 * scrapeada que inyecte instrucciones— podía convertir el chat en un open redirect
 * (o un `javascript:`) desde el origen de la app. La tool `navigate` ya sanea en el
 * servidor; esto es la segunda capa, en el punto donde de verdad se ejecuta.
 *
 * Acepta solo rutas RELATIVAS de la propia app. Devuelve null si no es admisible.
 */
export function safeNavPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const p = raw.trim();
  if (!p.startsWith("/") || p.startsWith("//") || p.includes("\\")) return null;
  if (/[\u0000-\u001f\u007f\s]/.test(p)) return null;
  if (/[<>"'`]/.test(p)) return null;
  return p;
}
