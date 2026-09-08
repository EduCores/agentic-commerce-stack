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

/** Normaliza a dígitos wa.me (ej "+56 9 3747 9835" → "56937479835"). null si inválido. */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("56") && digits.length === 11) return digits;
  if (digits.length === 9 && digits.startsWith("9")) return `56${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return digits;
  return null;
}

export function memberWaLink(phone: string, name?: string | null): string {
  const msg = name ? `Hola ${name}, escribo desde el Admin StarShop` : TEAM_WHATSAPP_MESSAGE;
  return waLink(phone, msg);
}

export function getStoreWhatsAppLink(): string {
  return waLink(STORE_WHATSAPP_NUMBER, STORE_WHATSAPP_MESSAGE);
}

/** null si el número del equipo aún no está configurado en env. */
export function getTeamWhatsAppLink(): string | null {
  if (!TEAM_WHATSAPP_NUMBER) return null;
  return waLink(TEAM_WHATSAPP_NUMBER, TEAM_WHATSAPP_MESSAGE);
}
