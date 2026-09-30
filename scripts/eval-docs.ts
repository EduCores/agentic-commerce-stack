/**
 * Eval del RAG de políticas (npm run test:docs).
 *
 * POR QUÉ EXISTE: `searchDocs` (agent/tools/search-docs.ts) responde políticas
 * desde el corpus versionado (docs/policies/*.md) en vez de la memoria del
 * modelo. Este eval fija 20 preguntas con documento esperado + datos que DEBEN
 * aparecer (cifras canónicas). Incluye paráfrasis sin overlap léxico para medir
 * el aporte vectorial. Usa la red solo para embedir la query (Gemini gratis);
 * sin key degrada a léxico (modo reportado).
 * Umbral: >=18/20.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv() {
  try {
    for (const raw of readFileSync(join(process.cwd(), ".env"), "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {}
}
loadEnv();

type Case = { q: string; doc: string; must: string[] };

const CASES: Case[] = [
  // envios.md (6)
  { q: "cuánto cuesta el despacho a la RM?", doc: "envios.md", must: ["3.990", "24-48h"] },
  { q: "desde qué monto el envío es gratis?", doc: "envios.md", must: ["49.990"] },
  { q: "cuánto se demora en llegar a Arica?", doc: "envios.md", must: ["9.990", "4-6 dias"] },
  { q: "tarifa de despacho a Valparaíso y su plazo", doc: "envios.md", must: ["4.990", "48-72h"] },
  { q: "envío a Puerto Montt, precio y días", doc: "envios.md", must: ["6.990", "3-4 dias"] },
  { q: "despachan al norte? a Iquique cuánto sale", doc: "envios.md", must: ["6.990"] },
  // garantias-devoluciones.md (5)
  { q: "cuántos años de garantía tienen los productos?", doc: "garantias-devoluciones.md", must: ["3 anos"] },
  { q: "si no me gusta, en cuántos días lo puedo devolver?", doc: "garantias-devoluciones.md", must: ["30 dias", "sin costo"] },
  { q: "qué necesito para hacer válida la garantía?", doc: "garantias-devoluciones.md", must: ["boleta"] },
  { q: "qué pasa si el producto llega malo?", doc: "garantias-devoluciones.md", must: ["30 dias"] },
  { q: "en qué estado debe estar el producto para devolverlo?", doc: "garantias-devoluciones.md", must: ["sin uso", "empaque original"] },
  // b2b-mayorista.md (5)
  { q: "si compro 12 taladros me hacen precio?", doc: "b2b-mayorista.md", must: ["15%", "10 o mas"] },
  { q: "descuento llevando 7 unidades?", doc: "b2b-mayorista.md", must: ["8%", "5 a 9"] },
  { q: "dan factura para empresa?", doc: "b2b-mayorista.md", must: ["factura"] },
  { q: "tienen crédito para empresas?", doc: "b2b-mayorista.md", must: ["30 dias"] },
  { q: "cuánto demoran en aprobar la cuenta empresa?", doc: "b2b-mayorista.md", must: ["24 horas"] },
  // compra.md (4)
  { q: "cómo pago con tarjeta?", doc: "compra.md", must: ["webpay"] },
  { q: "cuáles son los pasos para comprar?", doc: "compra.md", must: ["carrito", "comuna"] },
  { q: "me reservan el stock al comprar?", doc: "compra.md", must: ["reserva"] },
  { q: "qué medios de pago aceptan?", doc: "compra.md", must: ["transferencia", "mercadopago"] },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

async function main() {
  const { searchDocs } = await import("../agent/lib/search/docs-retrieval");
  console.log("=== EVAL DOCS-RAG (políticas) ===");
  let pass = 0;
  let modes: Record<string, number> = {};
  for (const c of CASES) {
    const hits = await searchDocs(c.q, 3);
    const mode = hits[0]?.mode ?? "empty";
    modes[mode] = (modes[mode] ?? 0) + 1;
    const joined = norm(hits.map((h) => h.text).join("\n"));
    const docOk = hits[0]?.source === c.doc;
    const missing = c.must.filter((m) => !joined.includes(norm(m)));
    const ok = docOk && missing.length === 0;
    if (ok) pass++;
    console.log(
      `${ok ? "OK  " : "FAIL"} "${c.q}" → ${hits[0]?.source ?? "∅"} (esperado ${c.doc}) [${mode}]${missing.length ? ` falta: ${missing.join(", ")}` : ""}`,
    );
  }
  console.log(`modos: ${JSON.stringify(modes)}`);
  const need = 18;
  console.log(pass >= need ? `EVALS TODO OK (${pass}/${CASES.length}, umbral ${need})` : `EVALS FAIL: ${pass}/${CASES.length} (umbral ${need})`);
  process.exit(pass >= need ? 0 : 1);
}

main().catch((e) => {
  console.error("EVAL-DOCS FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
