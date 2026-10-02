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
    const { payload } = await jwtVerify(token, JWT_SECRET);
    // Rol member = demo/clientes externos: lectura acotada + cero escritura.
    // 1) Escrituras: ningún /api/* no-GET salvo auth/chat ya autorizados arriba.
    //    Sin Server Actions en el proyecto, esto cubre todas las mutaciones.
    // 2) Lecturas sensibles denegadas aunque sean GET (secretos, prompts,
    //    PII de emails/clientes): agentes, workflows, emails, chat admin,
    //    meta, crm y store. La demo sigue viva en /, productos, pedidos,
    //    marketing, analítica, AI, equipo y chat de tienda.
    // 3) Páginas con datos sensibles renderizados en servidor (prompts en
    //    /agents, grafos en /workflows, PII en /admin/emails y /crm, chat de
    //    dueño en /admin) redirigen a /.
    if ((payload.role as string) === "member") {
      const MEMBER_DENY_API = [
        "/api/agents",
        "/api/workflows",
        "/api/admin/emails",
        "/api/admin/chat",
        "/api/meta",
        "/api/crm",
        "/api/store",
      ];
      const MEMBER_DENY_PAGES = ["/agents", "/workflows", "/admin/emails", "/admin", "/crm"];
      if (pathname.startsWith("/api/")) {
        if (MEMBER_DENY_API.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
          return NextResponse.json({ error: "Solo lectura: área no disponible para tu rol" }, { status: 403 });
        }
        if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
          return NextResponse.next();
        }
        return NextResponse.json({ error: "Solo lectura: tu rol no permite modificar" }, { status: 403 });
      }
      if (MEMBER_DENY_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
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
