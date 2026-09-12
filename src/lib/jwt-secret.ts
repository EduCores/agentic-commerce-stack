/**
 * Secreto JWT compartido — fail-closed en producción.
 * Sin dependencias Node: seguro para importar desde middleware (edge) y rutas.
 */
const DEV_FALLBACK = "acs-dev-secret-change-in-prod-32chars";

export function getJwtSecret(): Uint8Array {
  const raw = process.env.ADMIN_JWT_SECRET || process.env.AUTH_SECRET || "";
  if (!raw || raw === DEV_FALLBACK) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[auth] ADMIN_JWT_SECRET no configurado en producción. Define ADMIN_JWT_SECRET (32+ caracteres) y redespliega.");
    }
    return new TextEncoder().encode(DEV_FALLBACK);
  }
  return new TextEncoder().encode(raw);
}
