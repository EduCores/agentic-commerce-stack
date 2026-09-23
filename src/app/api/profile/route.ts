import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, AUTH_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/adapters/prisma";

type ProfileRequest = {
  fullName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  country?: string;
  bio?: string;
};

const ALLOWED_FIELDS: (keyof ProfileRequest)[] = ["fullName", "phone", "website", "address", "country", "bio"];

function validateProfileUpdate(data: ProfileRequest): string | null {
  if (data.fullName !== undefined && !data.fullName.trim())
    return "El nombre completo es obligatorio.";
  if (data.email !== undefined && data.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    return "Ingresa un correo válido.";
  if (data.phone !== undefined && data.phone.trim() && !/^[\d\s\+\-\(\)]{7,20}$/.test(data.phone))
    return "Número de teléfono inválido.";
  return null;
}

export async function GET() {
  const token = (await cookies()).get(AUTH_COOKIE.name)?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  const admin = await prisma.adminUser.findUnique({ where: { id: session.id } });
  if (!admin) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  const profileData = admin.profileData as Record<string, unknown> | null;
  return NextResponse.json({
    fullName: admin.name ?? "",
    email: admin.email,
    phone: admin.phone ?? "",
    website: profileData?.website ?? "",
    address: profileData?.address ?? "",
    country: profileData?.country ?? "cl",
    bio: profileData?.bio ?? "",
  });
}

export async function PATCH(req: Request) {
  const token = (await cookies()).get(AUTH_COOKIE.name)?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  const data: ProfileRequest = await req.json().catch(() => ({}));
  const validation = validateProfileUpdate(data);
  if (validation) return NextResponse.json({ error: validation }, { status: 400 });
  const updateData: Record<string, unknown> = {};
  if (data.fullName !== undefined) updateData.name = data.fullName.trim();
  if (data.phone !== undefined) updateData.phone = data.phone.trim() || null;
  if (ALLOWED_FIELDS.some((f) => data[f] !== undefined)) {
    updateData.profileData = {
      website: data.website ?? "",
      address: data.address ?? "",
      country: data.country ?? "cl",
      bio: data.bio ?? "",
    };
  }
  const updated = await prisma.adminUser.update({ where: { id: session.id }, data: updateData });
  const profileData = updated.profileData as Record<string, unknown> | null;
  return NextResponse.json({
    fullName: updated.name ?? "",
    email: updated.email,
    phone: updated.phone ?? "",
    website: profileData?.website ?? "",
    address: profileData?.address ?? "",
    country: profileData?.country ?? "cl",
    bio: profileData?.bio ?? "",
  });
}

export async function DELETE(req: Request) {
  const token = (await cookies()).get(AUTH_COOKIE.name)?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  const body: { email?: string } = await req.json().catch(() => ({}));
  if (body.email !== session.email) return NextResponse.json({ error: "El email no coincide" }, { status: 400 });
  await prisma.adminUser.delete({ where: { id: session.id } });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE.name, "", { ...AUTH_COOKIE.options, maxAge: 0 });
  return res;
}