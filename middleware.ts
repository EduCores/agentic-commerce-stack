import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/jwt-secret";

const COOKIE_NAME = "acs_admin_token";
const JWT_SECRET = getJwtSecret();

const PUBLIC_PATHS = ["/login", "/auth", "/api/auth/login", "/api/auth/signup", "/api/auth/reset-request", "/api/auth/reset-confirm", "/api/auth/2fa", "/api/auth/logout", "/api/auth/me", "/api/chat", "/api/chat/stream", "/api/tts", "/_next", "/favicon", "/images", "/public"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Puente público del frontend StarShop (sin sesión admin): ingiere órdenes best-effort.
  if (pathname === "/api/store/orders-ingest" || pathname.startsWith("/api/store/orders-ingest/")) {
    return NextResponse.next();
  }
  if (isPublic(pathname) || pathname.startsWith("/api/")) {
    // /api/chat es público para el widget de tienda. /api/admin/* siempre protegido.
    const isAdminApi = pathname.startsWith("/api/admin") || pathname.startsWith("/api/store") || pathname.startsWith("/api/slider") || pathname.startsWith("/api/orders") || pathname.startsWith("/api/products") || pathname.startsWith("/api/dashboard") || pathname.startsWith("/api/agents") || pathname.startsWith("/api/workflows") || pathname.startsWith("/api/analytics") || pathname.startsWith("/api/marketing") || pathname.startsWith("/api/crm") || pathname.startsWith("/api/ai");
    if (!isAdminApi) return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    return NextResponse.redirect(new URL("/auth/sign-in", req.url));
  }
  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sesión expirada" }, { status: 401 });
    const res = NextResponse.redirect(new URL("/auth/sign-in", req.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
