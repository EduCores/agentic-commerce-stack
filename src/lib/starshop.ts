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
