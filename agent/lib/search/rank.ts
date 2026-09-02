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

  for (const product of products) {
    const c = buildCandidate(product);
    let score = 0;
    const matchedBy: string[] = [];

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

    // 4) Tokens (con sinónimos y variantes) en el título
    for (const term of expanded) {
      if (c.title === term) {
        score += 25;
        matchedBy.push(term);
      } else if (c.title.includes(term)) {
        score += term.length > 3 ? 15 : 12;
        matchedBy.push(term);
      }
    }

    // 5) Tokens en aliases / tags / categoría
    for (const term of expanded) {
      if (c.aliases.some((alias) => alias === term || alias.includes(term))) {
        score += 12;
        matchedBy.push(`alias:${term}`);
      } else if (c.tags.some((tag) => tag === term || tag.includes(term))) {
        score += 8;
      } else if (c.category.includes(term)) {
        score += 6;
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

    if (score > 0) hits.push({ product, score, matchedBy });
  }

  hits.sort((a, b) => b.score - a.score);
  return { hits, tokens, expandedTerms: expanded, total: hits.length };
}
