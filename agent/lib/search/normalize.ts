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
 * Palabras de charla social (saludo, cortesía, reencuentro) Y palabras de
 * identidad/estado del propio asistente. No describen un producto y permiten
 * distinguir "estamos de vuelta?" / "estás conectado?" de "tienes taladros?".
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
  // ── Estado / identidad del propio asistente (con y sin faltas de tipeo) ──
  "conectado", "conectada", "conectados", "conectadas", "conectandose",
  "cnectado", "cnectada", "cnectados", "cnectadas", "cnectado?", "conectado?",
  "funciona", "funcionan", "funcionando", "funcionas", "funcion",
  "vivo", "viva", "vivos", "alive",
  "bot", "bots", "robot", "robots", "agente", "agentes", "ia",
  "real", "reales", "humano", "humana", "persona", "personas",
  "eres", "somos", "existes", "existo", "existen", "eres_robot",
  "oyes", "escucha", "escuchas", "oigo", "hearme", "hear",
  "aqui", "ahi", "alla", "sirve", "sirven", "sirvo", "ayudame", "ayuda",
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
  // ── Verbos y nouns de "prueba de vida" (nunca son un producto) ──
  "sigue", "sigues", "siguen", "siguiente", "continua", "continuas", "continuan",
  "habla", "hablan", "hablas", "hablamos", "lee", "leen", "leemos", "leiendo",
  "entiende", "entienden", "entiendes", "entendiendo",
  "test", "tests", "testing", "prueba", "pruebas", "probando", "probar",
  "sonido", "conexion", "sistema", "voz",
  "ah", "ahi", "alla", "alla", "quedo", "quedas", "quedan",
  "alguien", "nadie", "personas", "humano", "humana", "bot", "bots", "robot", "robots",
  "conectado", "conectada", "conectados", "conectadas", "cnectado", "cnectada",
  "cnectados", "cnectadas", "funcionando", "funcionas", "vivo", "viva", "vivos",
  "oyes", "escuchas", "escucha", "escuchame", "oime", "oigo", "lees",
  "eres", "somos", "existes", "existo", "existen", "real", "reales",
  "sirvo", "ayudame", "ayuda", "alhi", "aqui",
  // Pronombres/demostrativos: nunca nombran un producto ("necesito algo para...").
  "algo", "alguien", "esto", "eso", "este", "esta", "estos", "estas",
  "ese", "esa", "esos", "esas", "aquel", "aquella", "aquello",
  // Verbos de uso/intención: describen la tarea, no el producto ("para instalar un enchufe").
  "instalar", "instalacion", "instalaciones", "colocar", "colocacion",
  "poner", "cambiar", "reparar", "arreglar", "conectar",
  "comprar", "compra", "compro", "llevar", "llevo", "cotizar", "cotizacion",
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

/**
 * Detección de PREGUNTAS/checkS SOBRE EL PROPIO ASISTENTE
 * ("¿estás conectado?", "¿me escuchas?", "¿eres un bot?", "test", "habla un humano").
 *
 * Motivo del fix: isSmallTalk exige que TODOS los tokens sean sociales, así que
 * basta que el usuario escriba un token desconocido ("cnectado" sin la "o") para
 * que la charla se cuele como búsqueda de catálogo y el agente anuncie
 * "¡Vamos! Busco 'estas cnectado?' en todo el catálogo".
 *
 * Se resuelve por TOKENS (no por regex con raíces parciales) para que
 * "cnectado" / "conectado" / "conectando" se reconozcan igual, y con las
 * faltas de tipeo más habituales del español.
 */

/** Cualquier token que hable del estado/identidad del asistente. */
const META_SUBJECT = new Set([
  "cnectado", "cnectada", "cnectados", "cnectadas", "cnectando",
  "conectado", "conectada", "conectados", "conectadas", "conectando", "conectandote",
  "funciona", "funcionan", "funcionando", "funcionas", "funcion",
  "vivo", "viva", "vivos", "alive",
  "bot", "bots", "robot", "robots", "agente", "agentes", "ia", "inteligencia",
  "humano", "humana", "persona", "personas", "real", "reales", "seres",
  "sirve", "sirven", "sirvo", "alguien", "nadie", "ahi", "alla", "aqui",
  "oyes", "oigo", "escuchas", "escucha", "escuchame", "oime", "lees", "leyendo",
  "entiendes", "entienden", "entiendo",
  "ahi", "aqui", "alla", "ahi", "sigue", "sigues", "vive",
]);

/** Verbos/nouns que convierten alMensaje en un check del asistente. */
const META_PREDICATE = new Set([
  "estas", "esta", "estais", "eres", "somos", "soy", "existes", "existo", "existen",
  "sigues", "sigue", "siguen", "continua", "continuas", "continuan", "quedas", "quedo", "quedan",
  "funciona", "funcionan", "funcionas", "funcionando", "anda", "andas", "andan",
  "oyes", "oigo", "escuchas", "escucha", "escuchame", "oime", "lees", "leyendo", "lee",
  "entiendes", "entienden", "entiendo", "entiende",
  "habla", "hablan", "hablas", "hablamos", "hablame",
  "me", "me_", "y", "te", "nos",
  "puedes", "puede", "podrias", "podria", "quieres", "quiero", "sabes", "sabe",
]);

/** Mensajes que son 100% una prueba de vida, sin importar los tokens. */
const META_EXACT = new Set([
  "test", "tests", "testing", "prueba", "pruebas", "prueba de sonido",
  "prueba de conexion", "prueba de sistema", "1 2 3", "123", "1 1 1",
]);

/**
 * Palabras que SÍ son productos reales: si aparecen, el mensaje NO es una
 * meta-pregunta aunque incluya "estás conectado?" (p.ej. "estás conectado?
 * necesito un taladro" → el usuario quiere el taladro).
 */
const PRODUCT_HINT_WORDS = new Set([
  "taladro", "taladros", "cable", "cables", "proyector", "proyectores", "herramienta",
  "herramientas", "producto", "productos", "catalogo", "precio", "precios", "stock",
  "pedido", "pedidos", "carrito", "carros", "cotizacion", "compra", "comprar",
  "herramiental", "electricidad", "electrico", "material", "materiales", "ferreteria",
  "pintura", "tejas", "vidrio", "arena", "cemento", "ladrillo", "madera", "acero",
  "hormigon", "tornillo", "tornillos", "candado", "llave", "llaves", "bomba",
  "bomba", "foco", "focos", "lampara", "lamparas", "enchufe", "enchufes",
  "tablero", "tableros", "cinta", "cintas", "broca", "brocas", "lija", "lijas",
]);

/**
 * true si el mensaje es un check sobre el estado o la identidad del asistente.
 * Estas NUNCA deben rutear a product_search ni ejecutar searchProducts/navigateTo.
 */
export function isAgentMetaQuestion(value: string): boolean {
  const t = normalize(value);
  if (!t) return false;
  if (META_EXACT.has(t)) return true;
  const tokens = tokenize(t).filter((x) => x.length > 1);
  if (tokens.length === 0) return false;
  // Si menciona un producto real → NO es meta (quiere comprar).
  if (tokens.some((tok) => PRODUCT_HINT_WORDS.has(tok))) return false;
  // Debe haber al menos un token de "estado" y uno de "predicado" (o uno solo
  // que sea inequívocamente del asistente: "conectado", "vivo", "bot").
  const hasSubject = tokens.some((tok) => META_SUBJECT.has(tok));
  const hasPredicate = tokens.some((tok) => META_PREDICATE.has(tok));
  if (!hasSubject) return false;
  // "conectado" / "vivo" / "bot" solos o con predicado → meta.
  return hasPredicate || tokens.length <= 2;
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
