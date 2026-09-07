import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

export async function GET() {
  try {
    const stores = await prisma.storeConnection.findMany({ orderBy: { createdAt: "desc" } });
    const products = await prisma.product.findMany({ take: 20, orderBy: { updatedAt: "desc" } });
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
