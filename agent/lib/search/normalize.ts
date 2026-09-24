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

/**
 * Palabras de charla social (saludo, cortesía, reencuentro). No describen un
 * producto y permiten distinguir "estamos de vuelta?" de "tienes taladros?".
 */
export const SOCIAL_WORDS = new Set([
  "hola", "holaa", "hey", "buenas", "buenos", "dias", "tardes", "noches",
  "saludos", "saludo", "gracias", "muchas", "mil",
  "bienvenido", "bienvenida", "bienvenidos",
  "chao", "adios", "luego", "vemos", "hasta", "gusto", "placer",
  "equipo", "star", "amigo", "amiga", "amigos",
  "vuelta", "volvimos", "volvio", "volvemos", "nuevamente", "denuevo",
  "tal", "todo", "todos", "toda",
  "como", "estas", "estan", "estamos", "anda", "andas", "andan", "va", "van", "dia",
]);

/** Muletillas de consulta que nunca son el producto (incluye faltas típicas). */
const QUERY_FILLERS = new Set([
  ...STOPWORDS,
  ...SOCIAL_WORDS,
  // Confirmaciones/seguimiento: dependen del contexto, no son producto.
  "ok", "okey", "oka", "vale", "dale", "listo", "perfecto", "genial", "excelente", "claro", "obvio", "sip", "nop",
  // Preguntas de precio/estado: sin producto no hay nada que buscar.
  "cuanto", "cuanta", "cuantos", "cuantas", "sale", "salen", "cuesta", "cuestan", "cobran", "costo", "precio", "valor",
  // Muletillas de catálogo.
  "tienes", "tiene", "tenga", "tienen", "hay", "existe", "existen",
  "buscas", "buscando", "buscano", "ando",
  "quieres", "quiere", "quieren", "ver",
  "muestrame", "muestranos", "dime", "dime?",
  "vende", "venden", "vendes",
  "tendra", "habra", "conseguire",
  "sabes", "sabe", "conoces", "conoce",
  "cual", "cuales", "donde", "cuando",
  "porfa", "porfavor", "favor", "gracias", "disculpa",
  "estoy", "estoi", "usar", "usa", "funciona", "funcionan", "sirve", "sirven",
]);

/**
 * true si TODO el mensaje es saludo/cortesía ("hola", "estamos de vuelta?",
 * "¿cómo están?", "gracias"): no hay tema de conversación ni producto.
 * Se usa para no rutear charla social al crew de productos ni ejecutar tools.
 */
export function isSmallTalk(value: string): boolean {
  const tokens = tokenize(value).filter((t) => t.length > 1);
  if (tokens.length === 0 || tokens.length > 8) return false;
  return tokens.every((t) => STOPWORDS.has(t) || SOCIAL_WORDS.has(t));
}

/** Tokens de producto: descartan stopwords, muletillas, cortesía y seguimiento. */
function productTokens(value: string): string[] {
  return tokenize(value).filter((t) => t.length > 1 && !QUERY_FILLERS.has(t));
}

/**
 * Extrae el producto objetivo de una frase ("tienes alicates?" → "alicates").
 * Determinístico: el agente debe usarlo en vez de la frase completa.
 * Devuelve "" cuando no hay producto objetivo (charla/saludo): en ese caso el
 * caller NO debe buscar ni navegar.
 */
export function cleanProductQuery(value: string): string {
  const tokens = productTokens(value);
  return tokens.length > 0 ? tokens.join(" ") : "";
}

/** Genera un slug URL desde un título (ej: "Proyector LED 200W" → "proyector-led-200w"). */
export function slugify(value: string): string {
  return normalize(value)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
