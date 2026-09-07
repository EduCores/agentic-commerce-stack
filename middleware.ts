import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "acs_admin_token";
const JWT_SECRET = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET || process.env.AUTH_SECRET || "acs-dev-secret-change-in-prod-32chars");

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout", "/api/auth/me", "/api/chat", "/api/chat/stream", "/api/tts", "/_next", "/favicon", "/images", "/public"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname) || pathname.startsWith("/api/")) {
    // APIs protegidas individualmente si hace falta; chat es público para el widget de tienda
    // Protege solo /api/store, /api/orders, /api/products, /api/dashboard si no hay token
    const isAdminApi = pathname.startsWith("/api/store") || pathname.startsWith("/api/orders") || pathname.startsWith("/api/products") || pathname.startsWith("/api/dashboard") || pathname.startsWith("/api/agents") || pathname.startsWith("/api/workflows");
    if (!isAdminApi) return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }
  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sesión expirada" }, { status: 401 });
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
