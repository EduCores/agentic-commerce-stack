/**
 * Ranking y relevancia de productos para searchProducts.
 * Combina: coincidencia de título/SKU/descripción, sinónimos, plurales,
 * aliases por producto (metadata) y fuzzy para errores de tipeo.
 */
import type { UniversalProduct } from "@/lib/adapters/store";
import { normalize, meaningfulTokens, tokenize } from "./normalize";
import { expandTerms } from "./synonyms";
import { fuzzyScore } from "./fuzzy";

export type ProductHit = {
  product: UniversalProduct;
  score: number;
  matchedBy: string[];
};

export type RankResult = {
  hits: ProductHit[]; // ordenados por score desc
  tokens: string[]; // tokens significativos de la consulta
  expandedTerms: string[]; // tokens + plurales + sinónimos usados
  total: number;
};

type Candidate = {
  title: string;
  description: string;
  sku: string;
  aliases: string[];
  tags: string[];
  category: string;
  words: string[]; // tokens del título (normalizados)
};

function buildCandidate(p: UniversalProduct): Candidate {
  const meta = (p.metadata ?? {}) as Record<string, unknown>;
  return {
    title: normalize(p.title),
    description: normalize(p.description ?? ""),
    sku: normalize(p.sku),
    aliases: ((meta.aliases as string[]) ?? []).map(normalize),
    tags: ((meta.tags as string[]) ?? []).map(normalize),
    category: normalize(String(meta.categoria ?? "")),
    words: tokenize(p.title),
  };
}

export function rankProducts(products: UniversalProduct[], query: string): RankResult {
  const tokens = meaningfulTokens(query);
  const rawText = normalize(query);
  const expanded = expandTerms(tokens);

  if (tokens.length === 0 && rawText.length === 0) {
    return { hits: [], tokens, expandedTerms: [], total: 0 };
  }

  const hits: ProductHit[] = [];

  // Frecuencia de cada término en títulos: los términos raros ("enchufe")
  // pesan más que los comunes ("exterior", "led"). Evita que un modificador
  // secundario le gane al sustantivo que el cliente busca.
  const candidates = products.map(buildCandidate);
  const df = new Map<string, number>();
  for (const term of new Set(expanded)) {
    let n = 0;
    for (const c of candidates) if (c.title.includes(term)) n++;
    df.set(term, n);
  }
  const idf = (term: string) => 1 + Math.log10(products.length / Math.max(1, df.get(term) ?? 1));

  for (let pi = 0; pi < products.length; pi++) {
    const product = products[pi];
    const c = candidates[pi];
    let score = 0;
    const matchedBy: string[] = [];
    const matchedTerms = new Set<string>();

    // 1) SKU exacto o parcial
    if (c.sku === rawText) {
      score += 60;
      matchedBy.push("sku");
    } else if (rawText.length >= 3 && c.sku.includes(rawText)) {
      score += 45;
      matchedBy.push("sku-parcial");
    }

    // 2) Título exacto o como frase
    if (c.title === rawText) {
      score += 100;
      matchedBy.push("titulo-exacto");
    } else if (rawText.length >= 3 && c.title.includes(rawText)) {
      score += 70;
      matchedBy.push("titulo");
    }

    // 3) Aliases del producto (la "memoria" cargada desde el catálogo)
    for (const alias of c.aliases) {
      if (alias === rawText) {
        score += 60;
        matchedBy.push("alias");
      } else if (rawText.length >= 3 && (alias.includes(rawText) || rawText.includes(alias))) {
        score += 35;
        matchedBy.push("alias");
      }
    }

    // 4) Tokens (con sinónimos y variantes) en el título, ponderados por rareza
    for (const term of expanded) {
      if (c.title === term) {
        score += 25 * idf(term);
        matchedBy.push(term);
        matchedTerms.add(term);
      } else if (c.title.includes(term)) {
        score += (term.length > 3 ? 15 : 12) * idf(term);
        matchedBy.push(term);
        matchedTerms.add(term);
      }
    }

    // 4b) Head noun: en español el sustantivo va primero ("enchufe exterior").
    // Si el título trae el primer término, es el producto (no un accesorio).
    const head = tokens[0];
    if (head && head.length > 2 && c.title.includes(head)) {
      score += 10;
      matchedBy.push("head");
    }

    // 5) Tokens en aliases / tags / categoría (taxonomía de la tienda pesa)
    for (const term of expanded) {
      if (c.aliases.some((alias) => alias === term || alias.includes(term))) {
        score += 12;
        matchedBy.push(`alias:${term}`);
      } else if (c.tags.some((tag) => tag === term || tag.includes(term))) {
        score += 8;
      } else if (term.length > 2 && c.category.includes(term)) {
        score += 12;
        matchedBy.push(`categoria:${term}`);
      }
    }

    // 6) Tokens en descripción o SKU
    for (const term of expanded) {
      if (c.description.includes(term)) score += 3;
      if (c.sku.includes(term)) score += 4;
    }

    // 7) Fuzzy contra palabras del título (tolera typos)
    for (const token of tokens) {
      for (const word of c.words) {
        const fz = fuzzyScore(token, word);
        if (fz > 0) {
          score += fz * 20;
          matchedBy.push(`fuzzy:${token}~${word}`);
          break;
        }
      }
    }

    // Bonus por cobertura: calzar 2+ términos distintos de la consulta
    // ("enchufe exterior" real) supera a calzar solo un modificador.
    if (matchedTerms.size >= 2) {
      score += 20;
      matchedBy.push("multi-termino");
    }

    if (score > 0) hits.push({ product, score, matchedBy });
  }

  hits.sort((a, b) => b.score - a.score);
  return { hits, tokens, expandedTerms: expanded, total: hits.length };
}
