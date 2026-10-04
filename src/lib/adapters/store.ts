/**
 * ACS Store Adapter — interfaz universal para cualquier tienda
 * Implementa Shopify, WooCommerce, Magento o mock con el mismo contrato
 */
import { prisma } from "@/lib/adapters/prisma";
import type { Product, StoreConnection } from "@/generated/prisma/client";

// ── Tipos universales ──
export type UniversalProduct = {
  externalId?: string;
  sku: string;
  title: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  currency?: string;
  stock: number;
  images?: string[];
  metadata?: Record<string, unknown>;
};

export type StockCheck = {
  sku: string;
  available: number;
  reserved: number;
  isAvailable: boolean;
};

export type StoreAdapter = {
  provider: string;
  listProducts(storeId: string): Promise<UniversalProduct[]>;
  getProduct(storeId: string, sku: string): Promise<UniversalProduct | null>;
  checkStock(storeId: string, sku: string, qty: number): Promise<StockCheck>;
  reserveStock(storeId: string, sku: string, qty: number): Promise<StockCheck>;
  releaseStock(storeId: string, sku: string, qty: number): Promise<StockCheck>;
  syncProducts(storeId: string): Promise<number>;
};

// ── Mock Adapter (default, sin credenciales) ──
const mockAdapter: StoreAdapter = {
  provider: "mock",
  async listProducts(storeId) {
    const rows = await prisma.product.findMany({ where: { storeId } });
    return rows.map(toUniversal);
  },
  async getProduct(storeId, sku) {
    const p = await prisma.product.findFirst({ where: { storeId, sku } });
    return p ? toUniversal(p) : null;
  },
  async checkStock(storeId, sku, qty) {
    const p = await prisma.product.findFirst({ where: { storeId, sku } });
    if (!p) throw new Error(`Product not found: ${sku}`);
    return {
      sku,
      available: p.stock - p.reservedStock,
      reserved: p.reservedStock,
      isAvailable: p.stock - p.reservedStock >= qty,
    };
  },
  async reserveStock(storeId, sku, qty) {
    const p = await prisma.product.findFirst({ where: { storeId, sku }, select: { id: true } });
    if (!p) throw new Error(`Product not found: ${sku}`);
    // ATÓMICO: check + reserva en UNA sola sentencia. El TOCTOU anterior
    // (leer, comparar en JS, incrementar) permitía oversell con dos compras
    // simultáneas de las últimas unidades. 0 filas = sin stock suficiente.
    const rows = await prisma.$executeRaw`UPDATE "Product" SET "reservedStock" = "reservedStock" + ${qty}, "updatedAt" = NOW() WHERE id = ${p.id} AND ("stock" - "reservedStock") >= ${qty}`;
    if (Number(rows) === 0) throw new Error(`Insufficient stock for ${sku}`);
    const updated = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });
    return {
      sku,
      available: updated.stock - updated.reservedStock,
      reserved: updated.reservedStock,
      isAvailable: true,
    };
  },
  async releaseStock(storeId, sku, qty) {
    const p = await prisma.product.findFirst({ where: { storeId, sku }, select: { id: true } });
    if (!p) throw new Error(`Product not found: ${sku}`);
    // GREATEST evita reserva negativa si se libera más de lo apartado.
    await prisma.$executeRaw`UPDATE "Product" SET "reservedStock" = GREATEST("reservedStock" - ${qty}, 0), "updatedAt" = NOW() WHERE id = ${p.id}`;
    const updated = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });
    return {
      sku,
      available: updated.stock - updated.reservedStock,
      reserved: updated.reservedStock,
      isAvailable: true,
    };
  },
  async syncProducts(storeId) {
    const count = await prisma.product.count({ where: { storeId } });
    return count;
  },
};

// ── Shopify Adapter (placeholder — extiende mock con fetch a Shopify Admin API) ──
const shopifyAdapter: StoreAdapter = {
  ...mockAdapter,
  provider: "shopify",
  async syncProducts(storeId) {
    // TODO: fetch from https://{domain}/admin/api/2024-01/products.json
    // con apiKey/apiSecret de StoreConnection, luego upsert en prisma.product
    // Por ahora delega a mock para mantener build verde
    return mockAdapter.syncProducts(storeId);
  },
};

// ── Registry ──
const adapters: Record<string, StoreAdapter> = {
  mock: mockAdapter,
  shopify: shopifyAdapter,
  woocommerce: mockAdapter, // alias hasta implementar
  magento: mockAdapter,
  custom: mockAdapter,
};

export function getStoreAdapter(provider: string): StoreAdapter {
  return adapters[provider] ?? mockAdapter;
}

export async function getStoreAdapterForStore(storeId: string): Promise<{ store: StoreConnection; adapter: StoreAdapter }> {
  const store = await prisma.storeConnection.findUnique({ where: { id: storeId } });
  if (!store) throw new Error(`Store not found: ${storeId}`);
  return { store, adapter: getStoreAdapter(store.provider) };
}

function toUniversal(p: Product): UniversalProduct {
  return {
    externalId: p.externalId ?? undefined,
    sku: p.sku,
    title: p.title,
    description: p.description ?? undefined,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : undefined,
    currency: p.currency,
    stock: p.stock,
    images: (p.images as string[]) ?? undefined,
    metadata: (p.metadata as Record<string, unknown>) ?? undefined,
  };
}
