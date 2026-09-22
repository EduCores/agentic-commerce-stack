import { cookies } from "next/headers";
import { verifySessionToken, AUTH_COOKIE, type AdminSession } from "@/lib/auth";

/** Sesión admin o null (para proteger POST/PUT/DELETE del panel de correos). */
export async function requireAdmin(): Promise<AdminSession | null> {
  const token = (await cookies()).get(AUTH_COOKIE.name)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
