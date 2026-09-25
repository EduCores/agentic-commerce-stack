/**
 * MÁXIMOS PASOS DE TOOL-CALLING (modelo + tools + …) por request.
 *
 * POR QUÉ 3 Y NO 4: el plan gratuito de Vercel corta las funciones a los 10 s
 * (el `maxDuration: 30` de vercel.json no se aplica en Hobby). Medido en
 * producción: una búsqueda de producto encadenaba 4 rondas = 3 tools
 * (searchProducts + checkStock + navigateTo), con 49 s en el primer request
 * (cold start) y 5,8 s en caliente → 504 Gateway Timeout.
 *
 * Con 3 pasos caben las 2 tools que el agente realmente usa para responder
 * (searchProducts + checkStock). navigateTo se omite: la navegación la hace
 * el frontend con el toolName que ya viaja en la respuesta, así que perder
 * esa tool no deja al usuario sin enlace.
 *
 * Subirlo a 4+ solo tiene sentido con plan Pro (Vercel, 60 s).
 *
 * Vive en un módulo aparte para que el endpoint de health pueda reportarlo
 * sin importar todo `agent/index.ts` (que arrastra el SDK de AI).
 */
export const AGENT_MAX_STEPS = 3;