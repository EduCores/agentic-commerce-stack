/**
 * ACS WhatsApp — dos números separados:
 * - STORE: atención a clientes de la tienda (widget público StarShop).
 * - TEAM: canal interno del equipo de la tienda (botón flotante del Admin ACS).
 * Se configuran por env; nunca hardcodear números en componentes.
 */

export const STORE_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_STORE ?? "56993301557";

export const TEAM_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_TEAM ?? "";

export const STORE_WHATSAPP_MESSAGE =
  "Hola Starshop, quiero hacer una consulta";

export const TEAM_WHATSAPP_MESSAGE =
  "Hola equipo, escribo desde el Admin StarShop";

export function waLink(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function getStoreWhatsAppLink(): string {
  return waLink(STORE_WHATSAPP_NUMBER, STORE_WHATSAPP_MESSAGE);
}

/** null si el número del equipo aún no está configurado en env. */
export function getTeamWhatsAppLink(): string | null {
  if (!TEAM_WHATSAPP_NUMBER) return null;
  return waLink(TEAM_WHATSAPP_NUMBER, TEAM_WHATSAPP_MESSAGE);
}
