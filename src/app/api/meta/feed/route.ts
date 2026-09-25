import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { fetchTenantCatalog } from "@/lib/starshop";
import { corsHeaders, isOriginAllowed } from "@/lib/api/chat-guard";

export const dynamic = "force-dynamic";

const STORE_URL = process.env.STARSHOP_STORE_URL ?? "https://starshop-rho.vercel.app";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * GET /api/meta/feed — Feed de catálogo XML (format Shopify) para Meta Advantage+.
 * Meta escanea esta URL sin Origin; la defensa es no exponer secretos (solo catálogo público).
 * Productos del tenant starshop con descripción enriquecida si existe.
 */
export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  if (origin && !isOriginAllowed(origin)) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403, headers });
  }

  let store = await prisma.storeConnection.findFirst({
    where: { provider: "starshop" },
    orderBy: { createdAt: "asc" },
  });

  let rows: Array<{
    id: string;
    title: string;
    description?: string | null;
    price: number;
    stock: number;
    image?: string | null;
    url: string;
    brand?: string | null;
    category?: string | null;
    subcategory?: string | null;
  }> = [];

  if (store) {
    const products = await prisma.product.findMany({
      where: { storeId: store.id, isActive: true },
      select: {
        sku: true,
        externalId: true,
        title: true,
        description: true,
        price: true,
        stock: true,
        images: true,
        metadata: true,
      },
    });
    rows = products.map((p) => {
      const md = (p.metadata as Record<string, unknown> | null) ?? {};
      return {
        id: String(p.externalId ?? p.sku),
        title: p.title,
        description: (md.richDescription as string) ?? (md.description as string) ?? p.description,
        price: Number(p.price || 0),
        stock: Number(p.stock ?? 0),
        image: Array.isArray(p.images) ? (p.images[0] as string) ?? null : null,
        url: (md.url as string) ?? `/producto/${p.externalId ?? p.sku}`,
        brand: (md.brand as string) ?? null,
        category: (md.category as string) ?? null,
        subcategory: (md.subcategory as string) ?? null,
      };
    });
  } else {
    // Sin tenant sincronizado: catálogo vivo del store seed
    const live = await fetchTenantCatalog("seed-store", { tries: 2 }).catch(() => ({ products: [] }));
    rows = live.products.map((p) => ({
      id: p.externalId,
      title: p.title,
      description: p.description ?? p.shortDescription,
      price: p.price,
      stock: p.stock,
      image: p.images?.[0] ?? null,
      url: p.url ?? `/producto/${p.externalId}`,
      brand: p.brand ?? null,
      category: p.category ?? null,
      subcategory: p.subcategory ?? null,
    }));
  }

  const items = rows
    .map(
      (p) => `<item>
  <g:id>${esc(p.id)}</g:id>
  <g:title>${esc(p.title)}</g:title>
  <g:description>${esc(p.description ?? p.title)}</g:description>
  <g:link>${esc(`${STORE_URL}${p.url}`)}</g:link>
  <g:image_link>${esc(p.image ?? `${STORE_URL}/og-starshop.jpg`)}</g:image_link>
  <g:availability>${p.stock > 0 ? "in stock" : "out of stock"}</g:availability>
  <g:price>CLP ${Math.round(p.price)}</g:price>
  <g:condition>new</g:condition>
  <g:brand>${esc(p.brand ?? "StarShop")}</g:brand>
  <g:product_type>${esc([p.category, p.subcategory].filter(Boolean).join(" > "))}</g:product_type>
</item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>StarShop - Catálogo</title>
  <link>${esc(STORE_URL)}</link>
  <description>Catálogo de productos para anuncios de catálogo (Advantage+)</description>
  ${items}
</channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      ...headers,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}