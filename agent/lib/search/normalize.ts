/**
 * Normalización de texto para búsqueda de productos.
 * Quita tildes, pasa a minúsculas y tokeniza en español,
 * de modo que "Proyector LED", "proyector led" y "PROYECTOR LED" sean iguales.
 */

/** Normaliza una cadena: minúsculas + sin acentos + sin símbolos. */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Divide una cadena normalizada en tokens. */
export function tokenize(value: string): string[] {
  return normalize(value).split(" ").filter(Boolean);
}

const STOPWORDS = new Set([
  "el", "la", "los", "las", "de", "del", "y", "e", "o", "u", "mi", "mis",
  "un", "una", "unos", "unas", "con", "sin", "para", "que", "cual", "quien",
  "quiero", "necesito", "busco", "hay", "me", "te", "se", "en", "a", "al",
  "por", "pero", "mas", "tambien", "es", "son", "esta", "estan", "tienen",
]);

/** Tokens significativos (excluye stopwords y tokens de un solo carácter). */
export function meaningfulTokens(value: string): string[] {
  return tokenize(value).filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

/** Genera un slug URL desde un título (ej: "Proyector LED 200W" → "proyector-led-200w"). */
export function slugify(value: string): string {
  return normalize(value)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
