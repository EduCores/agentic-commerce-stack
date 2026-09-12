import { SignJWT, jwtVerify } from "jose";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/adapters/prisma";
import { getJwtSecret } from "@/lib/jwt-secret";

const JWT_SECRET = getJwtSecret();
const COOKIE_NAME = "acs_admin_token";
const SESSION_DAYS = 7;

export type AdminSession = { id: string; email: string; name: string | null; role: string };

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSessionToken(admin: { id: string; email: string; name: string | null; role: string }) {
  return await new SignJWT({ email: admin.email, name: admin.name, role: admin.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(admin.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { id: payload.sub as string, email: payload.email as string, name: payload.name as string | null, role: payload.role as string };
  } catch {
    return null;
  }
}

export const AUTH_COOKIE = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  },
};

export async function getAdminByEmail(email: string) {
  return prisma.adminUser.findUnique({ where: { email: email.toLowerCase().trim() } });
}

export async function ensureDefaultAdmin() {
  const email = (process.env.ADMIN_EMAIL || "admin@starshop.cl").toLowerCase();
  const plain = process.env.ADMIN_PASSWORD;
  if (!plain) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[auth] ADMIN_PASSWORD no configurado en producción. Define ADMIN_PASSWORD y redespliega.");
    }
    return ensureSeedAdmin(email, "StarShop2026!", process.env.ADMIN_NAME || "Dueño StarShop");
  }
  return ensureSeedAdmin(email, plain, process.env.ADMIN_NAME || "Dueño StarShop");
}

async function ensureSeedAdmin(email: string, plain: string, name: string) {
  const existing = await prisma.adminUser.findUnique({ where: { email } }).catch(() => null);
  if (existing) return existing;
  const hash = await hashPassword(plain);
  try {
    return await prisma.adminUser.create({ data: { email, password: hash, name, role: "admin" } });
  } catch {
    return prisma.adminUser.findUnique({ where: { email } });
  }
}
