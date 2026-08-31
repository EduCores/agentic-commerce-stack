import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

export async function GET() {
  const stores = await prisma.storeConnection.findMany({ orderBy: { createdAt: "desc" } });
  const products = await prisma.product.findMany({ take: 20, orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ stores, products });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, provider, domain } = body;
  if (!name || !provider) return NextResponse.json({ error: "name and provider required" }, { status: 400 });
  const created = await prisma.storeConnection.create({ data: { name, provider, domain, apiKey: body.apiKey, apiSecret: body.apiSecret, config: body.config ?? {} } });
  return NextResponse.json(created, { status: 201 });
}
