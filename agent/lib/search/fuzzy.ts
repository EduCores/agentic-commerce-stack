/**
 * Búsqueda aproximada (fuzzy) para tolerar errores de tipeo del cliente
 * ("proyetor", "moladora", "taladroa" → deben resolver igual).
 * Distancia de Levenshtein + ratio de similitud.
 */

/** Distancia de Levenshtein entre dos cadenas. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const dp: number[] = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) dp[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Ratio de similitud entre 0 y 1. */
export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Puntaje fuzzy entre un token de búsqueda y una palabra candidata (0..1).
 * - Coincidencia exacta o prefijo → match fuerte.
 * - Tokens cortos (< 4 chars) solo aceptan prefijo (evita falsos positivos).
 * - Umbral adaptativo según longitud del token.
 */
export function fuzzyScore(token: string, candidate: string): number {
  if (!token || !candidate) return 0;
  if (token === candidate) return 1;
  if (candidate.startsWith(token)) return 0.9;
  if (token.length < 4) return 0;
  const sim = similarity(token, candidate);
  const threshold = token.length < 6 ? 0.9 : 0.82;
  return sim >= threshold ? sim : 0;
}
