/**
 * MÁXIMOS PASOS DE TOOL-CALLING (modelo + tools + …) por request.
 *
 * POR QUÉ 2 Y NO 4: dos límites medidos en producción se sumaban:
 *
 * 1) Vercel Hobby corta las funciones a los 10 s (el `maxDuration: 30` de
 *    vercel.json no se aplica en ese plan). 4 rondas = 3 tools = 504.
 * 2) Groq free tiene tope de **8.000 tokens por minuto** (verificado leyendo
 *    `x-ratelimit-limit-tokens` de la respuesta: 8000, no 1.000). Cada paso
 *    reenvía el system prompt + el historial + los resultados de las tools
 *    anteriores, así que los pasos se encarece: 2 pasos ≈ 1.600 tokens,
 *    4 pasos ≈ 3.500+. Con 3-4 rondas se agotaba el minuto y el siguiente
 *    request salía con 429 "Rate limit reached ... on tokens per minute".
 *
 * Con 2 pasos alcanza para responder: `searchProducts` (productos) y
 * `checkStock` (disponibilidad). Es lo que el usuario percibe.
 *
 * Para flujos que necesiten más (cotizaciones multi-línea), el plan Pro de
 * Vercel (60 s) y/o una key de pago de Groq dan el margen; ahí se sube a 4.
 */
export const AGENT_MAX_STEPS = 2;

/**
 * Tope de tokens de SALIDA por paso (500).
 *
 * El free de Groq da 8.000 tokens/minuto. Con 700 de salida por paso y 2-3
 * pasos, una sola conversación podía consumir el minuto completo y dejar al
 * siguiente usuario con 429. 500 basta para las respuestas de un asistente de
 * ventas (1-4 frases) y baja el consumo ~30% sin perder calidad perceptible.
 */
export const AGENT_MAX_OUTPUT_TOKENS = 500;