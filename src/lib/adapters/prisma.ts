/**
 * Prisma adapter — ACS
 * Centraliza la instancia de PrismaClient para evitar múltiples clientes en dev (HMR).
 */
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (url?.startsWith("prisma+postgres://") || url?.startsWith("prisma://")) {
    return new PrismaClient({ accelerateUrl: url });
  }
  if (url?.startsWith("postgres://") || url?.startsWith("postgresql://")) {
    const adapter = new PrismaPg({ connectionString: url });
    return new PrismaClient({ adapter });
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
