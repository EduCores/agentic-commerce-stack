/**
 * Diccionario de sinónimos del rubro comercio/iluminación/herramientas.
 * Permite que una consulta coloquial ("tester", "esmeril", "luces de obra")
 * encuentre el producto que la BD llama de otra forma.
 * Además se combina con los "aliases" que cada producto trae en su metadata.
 */

export const SYNONYMS: Record<string, string[]> = {
  raton: ["mouse"],
  mouse: ["raton"],
  teclado: ["keyboard"],
  keyboard: ["teclado"],
  monitor: ["pantalla"],
  pantalla: ["monitor"],
  laptop: ["portatil", "notebook"],
  notebook: ["portatil", "laptop"],
  portatil: ["notebook", "laptop"],
  proyector: ["reflector", "spot", "luces de obra"],
  reflectores: ["proyector"],
  reflector: ["proyector", "spot"],
  taladro: ["taladradora", "drill", "perforadora"],
  taladradora: ["taladro", "drill"],
  perforadora: ["taladro"],
  amoladora: ["esmeril", "radial", "esmeriladora"],
  esmeril: ["amoladora", "radial"],
  radial: ["amoladora", "esmeril"],
  "sierra circular": ["sierra"],
  sierra: ["sierra circular"],
  multimetro: ["tester", "multitester", "polimetro", "voltimetro"],
  tester: ["multimetro", "multitester"],
  multitester: ["multimetro"],
  polimetro: ["multimetro"],
  pinza: ["amperimetrica", "pinza amperimetrica"],
  "pinza amperimetrica": ["pinza", "amperimetrica"],
  amperimetrica: ["pinza amperimetrica"],
  "tubo uv": ["lampara uv", "luz ultravioleta", "luz negra"],
  "lampara uv": ["tubo uv", "luz ultravioleta"],
  hqi: ["lampara hqi", "metal halide"],
  sodio: ["lampara sodio", "vapor de sodio"],
  lijadora: ["lijado", "esmeriladora", "lija"],
  atornillador: ["destornillador", "atornilladora", "tornillador"],
  destornillador: ["atornillador", "tornillador"],
  "medidor de distancia": ["metro laser", "distanciometro", "medidor laser"],
  medidor: ["distanciometro", "metro laser"],
  inalambrico: ["a bateria", "sin cable", "recargable"],
  "a bateria": ["inalambrico", "recargable"],
  obra: ["proyector", "reflector", "luces de obra"],
};

/** Expande un token con sus sinónimos directos. */
export function synonymsFor(token: string): string[] {
  return SYNONYMS[token] ?? [];
}

/** Variantes morfológicas (plurales) de un token normalizado. */
export function wordVariants(token: string): string[] {
  const variants = new Set<string>([token]);
  if (token.length > 3) {
    if (token.endsWith("es")) variants.add(token.slice(0, -2));
    if (token.endsWith("s")) variants.add(token.slice(0, -1));
  }
  return Array.from(variants);
}

/** Conjunto de términos a buscar: token + variantes plurales + sinónimos. */
export function expandTerms(tokens: string[]): string[] {
  const expanded = new Set<string>();
  for (const token of tokens) {
    for (const variant of wordVariants(token)) {
      expanded.add(variant);
      for (const synonym of synonymsFor(variant)) expanded.add(synonym);
    }
  }
  return Array.from(expanded);
}
