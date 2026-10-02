import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, AUTH_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/adapters/prisma";

export async function GET() {
  try {
    // Defensa en profundidad: aunque el middleware ya bloquea a member en
    // /api/store, las apiKey/apiSecret/config nunca salen para ese rol
    // (credenciales de providers en texto plano).
    const token = (await cookies()).get(AUTH_COOKIE.name)?.value;
    const session = token ? await verifySessionToken(token) : null;
    const stores = await prisma.storeConnection.findMany({ orderBy: { createdAt: "desc" } });
    const products = await prisma.product.findMany({ take: 20, orderBy: { updatedAt: "desc" } });
    if (session?.role === "member") {
      return NextResponse.json({
        stores: stores.map((s) => ({ ...s, apiKey: null, apiSecret: null, config: null })),
        products,
      });
    }
    return NextResponse.json({ stores, products });
  } catch (e) {
    console.error("[API-STORE] GET error:", e);
    return NextResponse.json({ stores: [], products: [], warning: "DB no disponible", detail: e instanceof Error ? e.message : String(e) }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, provider, domain } = body;
    if (!name || !provider) return NextResponse.json({ error: "name and provider required" }, { status: 400 });
    const created = await prisma.storeConnection.create({ data: { name, provider, domain, apiKey: body.apiKey, apiSecret: body.apiSecret, config: body.config ?? {} } });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("[API-STORE] POST error:", e);
    return NextResponse.json({ error: "DB error", detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
