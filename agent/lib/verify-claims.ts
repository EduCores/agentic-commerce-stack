/**
 * Verificación post-hoc de afirmaciones numéricas — Fase 1 del harness.
 *
 * POR QUÉ: el STARSHOP_TRUTH_RULE ("solo afirma números que vengan en tool…")
 * es texto del prompt, no código: un modelo gratis lo puede ignorar y el chat
 * igual responde. Este validador es determinista y corre SIEMPRE después de
 * generar el texto final: extrae precios/stocks/SKUs afirmados y exige que cada
 * uno exista en los outputs de las tools de ESTE turno. Lo no verificable se
 * bloquea (1 reintento correctivo con los datos verificados, luego mensaje
 * honesto). Ver `scripts/eval-verify-claims.ts` (12 casos, `npm run test:verify`).
 *
 * Alcance deliberado (evita falsos positivos):
 * - Precios ($X) se verifican SOLO si corrió una tool de precios
 *   (searchProducts, calculatePricing, checkout, processPurchase). El texto de
 *   políticas ("despacho RM $3.990") sin tools no se castiga.
 * - Stock se verifica SOLO con verbos de disponibilidad (stock:/quedan/restan/
 *   disponibles/hay N uds) y SOLO si corrió checkStock o searchProducts.
 *   "10 unidades" a secas NO se verifica (suele ser eco de lo que pidió el cliente).
 * - SKUs se verifican SOLO si corrió searchProducts o checkStock.
 */

export type ToolEvidence = {
  toolName: string;
  args?: unknown;
  output?: unknown;
};

export type ClaimViolation = {
  kind: "price" | "stock" | "sku";
  claimed: string;
  detail: string;
};

export type VerifyClaimsResult = {
  ok: boolean;
  violations: ClaimViolation[];
  checked: { prices: number; stocks: number; skus: number };
  evidenceTools: string[];
};

export const VERIFY_FALLBACK_TEXT =
  "Prefiero no darte una cifra sin verificarla en este momento. ¿Me confirmas el producto exacto (nombre o SKU) para revisar precio y stock ahora mismo?";

const PRICE_TOOLS = new Set(["searchProducts", "calculatePricing", "checkout", "processPurchase"]);
const STOCK_TOOLS = new Set(["checkStock", "searchProducts"]);
const SKU_TOOLS = new Set(["searchProducts", "checkStock"]);

/** Pasos del SDK `ai` (generateText/streamText) → evidencia plana. Tolerante a formas. */
export function collectStepEvidence(steps: unknown): ToolEvidence[] {
  const out: ToolEvidence[] = [];
  if (!Array.isArray(steps)) return out;
  for (const s of steps) {
    if (!s || typeof s !== "object") continue;
    const step = s as Record<string, unknown>;
    const byId = new Map<string, ToolEvidence>();
    const calls = Array.isArray(step.toolCalls) ? step.toolCalls : [];
    for (const c of calls) {
      if (!c || typeof c !== "object") continue;
      const call = c as Record<string, unknown>;
      const id = String(call.toolCallId ?? call.id ?? "");
      const ev: ToolEvidence = {
        toolName: String(call.toolName ?? call.name ?? "unknown"),
        args: (call.input ?? call.args) as unknown,
      };
      if (id) byId.set(id, ev);
      else out.push(ev);
    }
    const results = Array.isArray(step.toolResults) ? step.toolResults : [];
    for (const r of results) {
      if (!r || typeof r !== "object") continue;
      const res = r as Record<string, unknown>;
      const id = String(res.toolCallId ?? res.id ?? "");
      const output = (res.output ?? res.result) as unknown;
      const existing = id ? byId.get(id) : undefined;
      if (existing) {
        existing.output = output;
        if (!existing.args) existing.args = (res.input ?? res.args) as unknown;
        out.push(existing);
        if (id) byId.delete(id);
      } else {
        out.push({
          toolName: String(res.toolName ?? res.name ?? "unknown"),
          args: (res.input ?? res.args) as unknown,
          output,
        });
      }
    }
    for (const ev of byId.values()) out.push(ev);
  }
  return out;
}

function toInt(raw: string): number {
  return Number(raw.replace(/\./g, "").split(",")[0]);
}

/** Números verificados: SOLO de campos numéricos conocidos (no IDs: un cuid
 *  "cmubsnx7" contiene dígitos sueltos que contaminarían el conjunto). */
const NUMERIC_KEYS = /price|stock|total|subtotal|shipping|amount|available|reserved|quantity|qty|discount|percent|costo|despacho/i;

function harvestNumbers(value: unknown, into: Set<number>): void {
  if (typeof value === "number" && Number.isFinite(value)) {
    into.add(Math.round(value));
    return;
  }
  if (typeof value === "string") {
    for (const m of value.matchAll(/\$\s?(\d[\d.]*)/g)) into.add(toInt(m[1]));
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) harvestNumbers(v, into);
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (NUMERIC_KEYS.test(k)) harvestNumbers(v, into);
      else if (v && typeof v === "object") harvestNumbers(v, into);
      else if (typeof v === "string") {
        for (const m of v.matchAll(/\$\s?(\d[\d.]*)/g)) into.add(toInt(m[1]));
      }
    }
  }
}

const SKU_RE = /\b([A-Z0-9]{2,}(?:-[A-Z0-9]+)+)\b/g;

function harvestSkus(value: unknown, into: Set<string>): void {
  if (typeof value === "string") {
    SKU_RE.lastIndex = 0;
    for (const m of value.matchAll(SKU_RE)) into.add(m[1].toUpperCase());
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) harvestSkus(v, into);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) harvestSkus(v, into);
  }
}

/** Precios CLP en el texto: $45.990 o $45990 (4+ dígitos o miles con punto). */
const PRICE_CLAIM_RE = /\$\s?(\d{1,3}(?:\.\d{3})+|\d{4,})(?:,\d{1,2})?/g;

/** Stock con verbo de disponibilidad explícito (no "N unidades" a secas). */
const STOCK_CLAIM_RES = [
  /stock[^\d]{0,12}(\d[\d.]*)/gi,
  /(?:quedan|restan|disponibles?)\s*:?\s*(\d[\d.]*)/gi,
  /hay\s+(\d[\d.]*)\s*(?:uds?|unidades?|en stock|disponibles?)/gi,
  /(\d[\d.]*)\s*(?:uds?|unidades?)\s+(?:disponibles?|en stock)/gi,
];

export function verifyClaims(text: string, evidence: ToolEvidence[]): VerifyClaimsResult {
  const violations: ClaimViolation[] = [];
  const checked = { prices: 0, stocks: 0, skus: 0 };
  const tools = [...new Set(evidence.map((e) => e.toolName))];
  const body = (text ?? "").trim();
  if (!body) return { ok: true, violations, checked, evidenceTools: tools };

  const numbers = new Set<number>();
  const skus = new Set<string>();
  for (const e of evidence) {
    harvestNumbers(e.output, numbers);
    harvestSkus(e.output, skus);
    harvestSkus(e.args, skus);
  }

  if (tools.some((t) => PRICE_TOOLS.has(t))) {
    PRICE_CLAIM_RE.lastIndex = 0;
    for (const m of body.matchAll(PRICE_CLAIM_RE)) {
      checked.prices++;
      const amount = toInt(m[1]);
      if (!numbers.has(amount)) {
        violations.push({
          kind: "price",
          claimed: m[0],
          detail: `monto $${amount.toLocaleString("es-CL")} no aparece en outputs de ${tools.filter((t) => PRICE_TOOLS.has(t)).join(",")}`,
        });
      }
    }
  }

  if (tools.some((t) => STOCK_TOOLS.has(t))) {
    for (const re of STOCK_CLAIM_RES) {
      re.lastIndex = 0;
      for (const m of body.matchAll(re)) {
        checked.stocks++;
        const qty = toInt(m[1]);
        if (!numbers.has(qty)) {
          violations.push({
            kind: "stock",
            claimed: m[0].trim(),
            detail: `cantidad ${qty} no aparece en outputs de ${tools.filter((t) => STOCK_TOOLS.has(t)).join(",")}`,
          });
        }
      }
    }
  }

  if (tools.some((t) => SKU_TOOLS.has(t))) {
    SKU_RE.lastIndex = 0;
    for (const m of body.matchAll(SKU_RE)) {
      checked.skus++;
      const sku = m[1].toUpperCase();
      if (!skus.has(sku)) {
        violations.push({ kind: "sku", claimed: m[1], detail: `SKU ${sku} no aparece en outputs de ${tools.filter((t) => SKU_TOOLS.has(t)).join(",")}` });
      }
    }
  }

  return { ok: violations.length === 0, violations, checked, evidenceTools: tools };
}

/** Hechos verificados en prosa corta, para el reintento correctivo (1 vez). */
export function buildVerifiedFacts(evidence: ToolEvidence[]): string {
  const lines: string[] = [];
  const num = (o: unknown, ...keys: string[]): number | null => {
    if (!o || typeof o !== "object") return null;
    const r = o as Record<string, unknown>;
    for (const k of keys) {
      const v = r[k];
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string" && /^[\d.,\s]+$/.test(v)) {
        const n = Number(v.replace(/\./g, "").replace(",", "."));
        if (Number.isFinite(n)) return n;
      }
    }
    return null;
  };
  const str = (o: unknown, ...keys: string[]): string | null => {
    if (!o || typeof o !== "object") return null;
    const r = o as Record<string, unknown>;
    for (const k of keys) if (typeof r[k] === "string" && (r[k] as string).trim()) return (r[k] as string).trim();
    return null;
  };
  const fmt = (n: number | null) => (n == null ? "?" : `$${Math.round(n).toLocaleString("es-CL")}`);
  for (const e of evidence) {
    const out = e.output;
    if (!out || typeof out !== "object") continue;
    if (e.toolName === "searchProducts") {
      const arr = (out as Record<string, unknown>).products;
      if (Array.isArray(arr)) {
        for (const p of arr.slice(0, 5)) {
          const sku = str(p, "sku") ?? "?";
          const title = str(p, "title") ?? "";
          const price = num(p, "price");
          const stock = num(p, "stock");
          lines.push(`- ${sku} ${title}: precio ${fmt(price)}, stock ${stock ?? "?"}`.trim());
        }
      }
    } else if (e.toolName === "checkStock") {
      const sku = str(e.args, "sku") ?? str(out, "sku") ?? "?";
      const avail = num(out, "available");
      const res = num(out, "reserved");
      lines.push(`- ${sku}: disponibles ${avail ?? "?"} (reservadas ${res ?? "?"})`);
    } else if (e.toolName === "calculatePricing") {
      const sku = str(e.args, "sku") ?? "?";
      const sub = num(out, "subtotal");
      const ship = num(out, "shipping", "shippingCost");
      const tot = num(out, "total");
      lines.push(`- ${sku}: subtotal ${fmt(sub)} + despacho ${fmt(ship)} = total ${fmt(tot)}`);
    }
  }
  return lines.join("\n");
}
