/**
 * Prisma adapter — ACS
 * Centraliza la instancia de PrismaClient para evitar múltiples clientes en dev (HMR).
 * Importar desde `@/lib/adapters/prisma` en lugar de `src/generated/prisma/client` directamente.
 */
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma 7 requires either `adapter` or `accelerateUrl`.
// For local Prisma Postgres (prisma+postgres://...), use accelerateUrl via DATABASE_URL.
// For direct Postgres with driver adapter, replace with: adapter: new PrismaPg({ connectionString })
function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (url?.startsWith("prisma+postgres://") || url?.startsWith("prisma://")) {
    return new PrismaClient({ accelerateUrl: url });
  }
  if (url) {
    return new PrismaClient({ accelerateUrl: url } as unknown as ConstructorParameters<typeof PrismaClient>[0]);
  }
  return new PrismaClient({
    accelerateUrl: "prisma+postgres://localhost:51213/?api_key=dummy",
  } as unknown as ConstructorParameters<typeof PrismaClient>[0]);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
