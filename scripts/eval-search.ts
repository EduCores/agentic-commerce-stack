/**
 * Batería de evals de navegación/búsqueda (Fase 3).
 * Determinística, sin BD ni LLM: mini-catálogo dorado.
 *   npx tsx scripts/eval-search.ts
 * Falla (exit 1) si algún caso no da el top-1 esperado.
 */
import { rankProducts } from "../agent/lib/search/rank";
import { cleanProductQuery } from "../agent/lib/search/normalize";
import type { UniversalProduct } from "../src/lib/adapters/store";

const P = (sku: string, title: string, categoria = ""): UniversalProduct => ({ sku, title, price: 1000, stock: 10, metadata: { categoria } });
const CATALOG: UniversalProduct[] = [
  P("ENCHUFE-SMART", "Enchufe Smart WiFi 16A Temporizador", "Interruptores & Enchufes"),
  P("LAMP-UV-20W", "Lámpara Atrapa Mosquitos UV 20W 80m2 + Bandeja + Cadena Exterior", "Seguridad Eléctrica"),
  P("TALADRO-20V", "Taladro Percutor Inalámbrico 20V 13mm Brushless", "Herramientas & Maquinarias"),
  P("SIERRA-800W", "Sierra Caladora 800W 6 Velocidades", "Herramientas & Maquinarias"),
  P("MULTI-DT830", "Multitester Digital DT-830B con Buzzer", "Instrumentos de Medición"),
  P("CINTA-LED-5M", "Cinta LED Blanca Fría 5m IP20 Adhesiva", "Iluminación LED y Neón"),
  P("ALICATE-8", "Alicate Universal 8 Pulgadas Acero CrV", "Herramientas & Maquinarias"),
  P("KIT-DOMOTICA", "Kit Domótica WiFi Interruptor Touch 3 Gang + Enchufe Smart 16A", "Domótica"),
];

let fails = 0;
function top(query: string, expect: string) {
  const clean = cleanProductQuery(query);
  const r = rankProducts(CATALOG, clean);
  const first = r.hits[0]?.product.sku ?? "(vacío)";
  const ok = first === expect;
  if (!ok) fails++;
  console.log(`${ok ? "OK  " : "FAIL"} "${query}" -> ${first} (esperado ${expect})`);
}
function cleanEmpty(query: string) {
  const clean = cleanProductQuery(query);
  const ok = clean === "";
  if (!ok) fails++;
  console.log(`${ok ? "OK  " : "FAIL"} "${query}" -> clean="${clean}" (esperado vacío)`);
}

top("Necesito algo para instalar un enchufe exterior", "ENCHUFE-SMART");
top("lámpara exterior", "LAMP-UV-20W");
top("taladro percutor", "TALADRO-20V");
top("enchufes", "ENCHUFE-SMART");
top("sierra caladora", "SIERRA-800W");
top("tester para medir corriente", "MULTI-DT830");
top("cinta led blanca", "CINTA-LED-5M");
top("taladroa", "TALADRO-20V");
top("alicates", "ALICATE-8");
top("cuanto sale el taladro", "TALADRO-20V");
top("kit domotica interruptor", "KIT-DOMOTICA");
cleanEmpty("hola");
cleanEmpty("estamos de vuelta?");
cleanEmpty("gracias");

if (fails > 0) {
  console.log(`FALLARON ${fails}`);
  process.exit(1);
}
console.log("EVALS TODO OK");
