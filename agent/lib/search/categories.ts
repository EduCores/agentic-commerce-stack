/**
 * Categorías navegables de StarShop.
 * Deben coincidir con las rutas que usa el tool "navigateTo"
 * y con el categorySlug almacenado en cada producto (metadata).
 */

export type ShopCategory = {
  slug: string;
  name: string;
  path: string;
  keywords: string[];
};

export const STARSHOP_CATEGORIES: ShopCategory[] = [
  {
    slug: "iluminacion-led-neon",
    name: "Iluminación LED y Neón",
    path: "/categoria/iluminacion-led-neon",
    keywords: [
      "proyector", "proyectores", "panel", "plafon", "reflector", "spot",
      "led", "iluminacion", "lampara", "luminaria", "obra", "neon", "tubo",
      "exterior", "fachada",
    ],
  },
  {
    slug: "herramientas-maquinarias",
    name: "Herramientas y Maquinarias",
    path: "/categoria/herramientas-maquinarias",
    keywords: [
      "taladro", "taladradora", "perforador", "atornillador", "destornillador",
      "sierra", "amoladora", "esmeril", "radial", "lijadora", "ingletadora",
      "herramienta", "maquina",
    ],
  },
  {
    slug: "instrumentos-medicion",
    name: "Instrumentos de Medición",
    path: "/categoria/instrumentos-medicion",
    keywords: [
      "multimetro", "tester", "pinza", "amperimetrica", "medidor",
      "distanciometro", "laser", "voltimetro", "medicion", "instrumento",
    ],
  },
  {
    slug: "tubos-lamparas-especiales",
    name: "Tubos y Lámparas Especiales",
    path: "/categoria/tubos-lamparas-especiales",
    keywords: [
      "tubo", "uv", "ultravioleta", "luz negra", "hqi", "sodio",
      "lampara", "especial", "metal halide", "vapor",
    ],
  },
];

export type CategorySuggestion = {
  name: string;
  slug: string;
  path: string;
};

function categoryScore(category: ShopCategory, text: string, tokens: string[]): number {
  let score = 0;
  if (text.length > 0 && category.name.toLowerCase().includes(text)) score += 10;
  for (const keyword of category.keywords) {
    const kw = keyword.toLowerCase();
    if (kw === text) score += 8;
    else if (text.includes(kw)) score += 4;
    for (const token of tokens) {
      if (kw === token) {
        score += 8;
        break;
      }
    }
  }
  return score;
}

/** Devuelve las categorías que mejor coinciden con la consulta (máx. 3). */
export function matchCategories(text: string, tokens: string[]): CategorySuggestion[] {
  return STARSHOP_CATEGORIES.map((category) => ({
    name: category.name,
    slug: category.slug,
    path: category.path,
    score: categoryScore(category, text, tokens),
  }))
    .filter((c) => c.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ name, slug, path }) => ({ name, slug, path }));
}

/** Todas las categorías (fallback cuando no hay ninguna coincidencia clara). */
export function allCategories(): CategorySuggestion[] {
  return STARSHOP_CATEGORIES.map(({ name, slug, path }) => ({ name, slug, path }));
}
