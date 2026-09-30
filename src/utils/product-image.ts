/**
 * Resuelve la imagen visible de un producto.
 * Prioridad: originales StarShop primero.
 * 1. Paths locales ("/foto.png"): viven en el public/ de StarShop
 *    (localhost:3000 o starshop-rho.vercel.app), se absolutizan con encodeURI.
 * 2. URLs https de StarShop (localhost:3000 / starshop-rho.vercel.app).
 * 3. Cualquier otra https (p.ej. Unsplash genérico) solo como fallback.
 * Sin imagen válida devuelve "" para que el llamador use el icono.
 */
const STARSHOP_ORIGIN = (
  process.env.NEXT_PUBLIC_STARSHOP_ORIGIN ?? "https://starshop-rho.vercel.app"
).replace(/\/$/, "");

export function resolveProductImage(images: unknown): string {
  const arr = Array.isArray(images)
    ? images.filter((u): u is string => typeof u === "string" && u.trim() !== "")
    : [];
  const local = arr.find((u) => u.startsWith("/"));
  if (local) return `${STARSHOP_ORIGIN}${encodeURI(local)}`;
  const starshopHttps = arr.find((u) =>
    /^https?:\/\/(localhost:3000|.*starshop-rho\.vercel\.app)/i.test(u),
  );
  if (starshopHttps) return starshopHttps;
  const https = arr.find((u) => /^https?:\/\//i.test(u));
  if (https) return https;
  return "";
}
