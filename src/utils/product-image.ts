/**
 * Resuelve la imagen visible de un producto.
 * - URLs https absolutas: se usan tal cual (universales y seguras).
 * - Paths locales ("/foto.png"): viven en el public/ de StarShop, así que se
 *   absolutizan a su origen con encodeURI (espacios, tildes, &).
 * Sin imagen válida devuelve "" para que el llamador use el icono.
 */
const STARSHOP_ORIGIN = (
  process.env.NEXT_PUBLIC_STARSHOP_ORIGIN ?? "https://starshop-rho.vercel.app"
).replace(/\/$/, "");

export function resolveProductImage(images: unknown): string {
  const arr = Array.isArray(images)
    ? images.filter((u): u is string => typeof u === "string" && u.trim() !== "")
    : [];
  const https = arr.find((u) => /^https?:\/\//i.test(u));
  if (https) return https;
  const local = arr.find((u) => u.startsWith("/"));
  if (local) return `${STARSHOP_ORIGIN}${encodeURI(local)}`;
  return "";
}
