import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.117"],
  // ACS architecture: keep serverExternalPackages for Prisma in Next 16+
  // Add transpilePackages if bridging agent/workflows that use ESM
  typedRoutes: false,
};

export default nextConfig;
