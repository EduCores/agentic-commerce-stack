import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Fija la raíz del proyecto para Turbopack: evita que Next infiera mal el workspace
// (si hay un package-lock.json suelto en una carpeta superior, compila/escanea allá y se cuelga).
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.117"],
  // ACS architecture: keep serverExternalPackages for Prisma in Next 16+
  // Add transpilePackages if bridging agent/workflows that use ESM
  typedRoutes: false,
  turbopack: {
    root: projectRoot,
  },
  // Evita que el build suba source-maps y cache dev al deploy
  // El peso real de deploy es ~8-12MB comprimido (Vercel lo prunea)
  experimental: {
    // No persistir cache de Turbopack en disco en prod (ya limpiado por scripts/clean.mjs en dev)
  },
};

export default nextConfig;
