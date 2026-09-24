/**
 * Higiene de datos de contacto: los formularios guardan valores limpios y
 * normalizados, listos para conectarse a cualquier servidor de correos
 * (Resend, SMTP, etc.) sin re-trabajo. Toda la capa de envío vive aislada
 * en `src/lib/emails/send.ts`: cambiar de proveedor = 1 archivo.
 */

/** Quita etiquetas HTML, colapsa espacios, recorta y limita largo. */
export function sanitizeText(v: string, max = 500): string {
  return v
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Email canónico: sin espacios y en minúsculas. */
export function normalizeEmail(v: string): string {
  return v.trim().toLowerCase();
}

/** Solo dígitos del teléfono, sin prefijo país. */
export function phoneDigits(v: string): string {
  let d = v.replace(/\D/g, "");
  if (d.startsWith("56") && d.length > 9) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 9);
}

/** Máscara viva chilena: +56 9 XXXX XXXX (acepta fijo de 8 dígitos). */
export function formatPhoneCL(v: string): string {
  const d = phoneDigits(v);
  if (!d) return "";
  const head = d.slice(0, 1);
  const p1 = d.slice(1, 5);
  const p2 = d.slice(5, 9);
  return `+56 ${head}${p1 ? ` ${p1}` : ""}${p2 ? ` ${p2}` : ""}`.trim();
}

/** Válido si tiene 8–9 dígitos (móvil o fijo chileno). */
export function validPhoneCL(v: string): boolean {
  const d = phoneDigits(v);
  return d.length >= 8 && d.length <= 9;
}
