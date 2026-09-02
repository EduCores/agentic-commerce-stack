/**
 * Validador local del motor de búsqueda del agente (Nivel B).
 * Uso: npx tsx scripts/test-search.ts
 */
import { prisma } from "../src/lib/adapters/prisma";
import searchProducts from "../agent/tools/search-products";

type SearchResult = {
  query: string;
  expandedTerms: string[];
  found: number;
  noResults: boolean;
  products: { sku: string; title: string; price: number }[];
  categorySuggestions: { name: string; path: string }[];
};

const cases: string[] = [
  "proyector led",
  "proyetor led", // typo → debe resolver por fuzzy
  "taladro",
  "taladroa", // typo
  "amoladora",
  "moladora", // typo
  "tester", // sinónimo de multímetro
  "multimetro", // sin tilde (el título lleva tilde)
  "pinza amperimetrica",
  "sierra circular",
  "tubo uv",
  "luces de obra", // alias coloquial de proyector
  "silla ergonomica", // no existe → debe devolver sugerencias, NO inventar
];

async function main() {
  const count = await prisma.product.count();
  console.log(`[DB] productos sembrados: ${count}\n`);

  for (const q of cases) {
    const res = (await searchProducts.execute({ storeId: "seed-store", query: q, limit: 5 })) as unknown as SearchResult;
    console.log("=".repeat(72));
    console.log(`QUERY: "${q}"`);
    console.log(`  found: ${res.found} | noResults: ${res.noResults}`);
    console.log(`  expandedTerms: ${res.expandedTerms.join(", ")}`);
    console.log(
      `  products: ${res.products.length ? res.products.map((p) => `${p.sku} — ${p.title} ($${p.price})`).join(" | ") : "(ninguno)"}`
    );
    console.log(`  categorySuggestions: ${res.categorySuggestions.map((c) => c.name).join(" | ")}\n`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
