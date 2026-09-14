// ============================================================
// Cliente para hablar con StarShop (frontend, puerto 3000)
// ============================================================
// El admin ACS consume el catálogo/autoritativo de StarShop vía
// GET {STARSHOP_API_URL}/api/store/products y gestiona el slider
// vía {STARSHOP_API_URL}/api/slides (x-admin-key = SLIDES_ADMIN_TOKEN).
// ============================================================

function starshopBase(): string {
  return process.env.STARSHOP_API_URL ?? "http://localhost:3000";
}

function slidesToken(): string {
  return process.env.SLIDES_ADMIN_TOKEN ?? "";
}

export interface StarshopProductRow {
  externalId: string;
  sku: string;
  title: string;
  description?: string | null;
  shortDescription?: string | null;
  price: number;
  compareAtPrice?: number | null;
  currency: string;
  stock: number;
  images?: string[];
  category?: string | null;
  subcategory?: string | null;
  brand?: string | null;
  secCertified?: boolean;
  discount?: number | null;
  url?: string;
}

export async function fetchStarshopProducts(): Promise<{ products: StarshopProductRow[]; syncedAt?: string }> {
  const res = await fetch(`${starshopBase()}/api/store/products`, { cache: "no-store" });
  if (!res.ok) throw new Error(`StarShop respondió ${res.status}`);
  const json = await res.json();
  return { products: json.products ?? [], syncedAt: json.syncedAt };
}

// ============================================================
// Sync MULTI-TENANT: catálogo VIVO por tienda (fuente de verdad).
// GET {STARSHOP_API_URL}/api/tenant/catalog?tenant=<storeId>
// — storeId aquí ES el slug del tenant en StarShop (misma identidad
//   que manda el widget en cada mensaje). Ver docs/SYNC-CONTRACTO.md
//   en el repo StarShop.
// ============================================================

/** Payload que devuelve StarShop en /api/tenant/catalog (camelCase del dominio Product). */
interface TenantCatalogPayload {
  tenantId?: string;
  provider?: string;
  syncedAt?: string;
  currency?: string;
  total?: number;
  products?: Array<{
    id: string;
    sku: string;
    name: string;
    slug?: string;
    description?: string | null;
    shortDescription?: string | null;
    price: number;
    originalPrice?: number | null;
    discount?: number | null;
    stock?: number;
    images?: string[];
    category?: string | null;
    subcategory?: string | null;
    brand?: string | null;
    secCertified?: boolean;
    isB2B?: boolean;
    tierPrices?: unknown;
    tags?: string[];
    warranty?: string | null;
  }>;
}

/** Fila del catálogo por tenant → forma que espera el upsert del sync (StarshopProductRow). */
export function normalizeTenantProduct(p: NonNullable<TenantCatalogPayload["products"]>[number]): StarshopProductRow {
  return {
    externalId: p.id,
    sku: p.sku,
    title: p.name,
    description: p.description ?? null,
    shortDescription: p.shortDescription ?? null,
    price: p.price,
    compareAtPrice: p.originalPrice ?? null,
    currency: "CLP",
    stock: p.stock ?? 0,
    images: p.images ?? [],
    category: p.category ?? null,
    subcategory: p.subcategory ?? null,
    brand: p.brand ?? null,
    secCertified: p.secCertified ?? false,
    discount: p.discount ?? null,
    url: `/producto/${p.id}`,
  };
}

/**
 * Lee el catálogo del tenant (slug = storeId) desde StarShop.
 * Idempotente del lado ACS: el upsert del sync es por (storeId, sku).
 */
export async function fetchTenantCatalog(storeId: string): Promise<{ products: StarshopProductRow[]; syncedAt?: string; provider?: string }> {
  const res = await fetch(`${starshopBase()}/api/tenant/catalog?tenant=${encodeURIComponent(storeId)}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`StarShop tenant catalog ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as TenantCatalogPayload;
  const products = (json.products ?? []).map(normalizeTenantProduct);
  return { products, syncedAt: json.syncedAt, provider: json.provider };
}

export interface HeroSlideRow {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  image: string;
  bg: string;
  sortOrder: number;
  active: boolean;
}

async function slidesFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${starshopBase()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "x-admin-key": slidesToken(), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`StarShop slides ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

export async function fetchStarshopSlides(): Promise<HeroSlideRow[]> {
  const json = await slidesFetch(`/api/slides?all=1`);
  return json.slides ?? [];
}

export async function createStarshopSlide(data: Partial<HeroSlideRow>) {
  return slidesFetch(`/api/slides`, { method: "POST", body: JSON.stringify(data) });
}

export async function updateStarshopSlide(id: number, data: Partial<HeroSlideRow>) {
  return slidesFetch(`/api/slides/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteStarshopSlide(id: number) {
  return slidesFetch(`/api/slides/${id}`, { method: "DELETE" });
}
