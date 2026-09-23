import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, verifyPassword, hashPassword, AUTH_COOKIE } from "@/lib/auth";
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

export type NotificationPrefs = {
  email: boolean;
  push: boolean;
  productUpdates: boolean;
  marketing: boolean;
  security: boolean;
};

export const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  email: true,
  push: false,
  productUpdates: true,
  marketing: false,
  security: true,
};

type ProfilePatchBody = ProfileRequest & {
  currentPassword?: string;
  newPassword?: string;
  notifications?: Partial<NotificationPrefs>;
  twoFactorEnabled?: boolean;
};

function readProfileData(raw: unknown): Record<string, unknown> {
  return typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
}

function readNotifications(raw: unknown): NotificationPrefs {
  const p = readProfileData(raw).notifications;
  const n = typeof p === "object" && p !== null ? (p as Partial<NotificationPrefs>) : {};
  return { ...DEFAULT_NOTIFICATIONS, ...n };
}

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
  const profileData = readProfileData(admin.profileData);
  return NextResponse.json({
    fullName: admin.name ?? "",
    email: admin.email,
    phone: admin.phone ?? "",
    website: profileData.website ?? "",
    address: profileData.address ?? "",
    country: profileData.country ?? "cl",
    bio: profileData.bio ?? "",
    twoFactorEnabled: profileData.twoFactorEnabled === true,
    notifications: readNotifications(admin.profileData),
  });
}

export async function PATCH(req: Request) {
  const token = (await cookies()).get(AUTH_COOKIE.name)?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  const data: ProfilePatchBody = await req.json().catch(() => ({}));
  const admin = await prisma.adminUser.findUnique({ where: { id: session.id } });
  if (!admin) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  // Cambio de contraseña: verifica la actual y guarda hash nuevo
  if (data.currentPassword !== undefined || data.newPassword !== undefined) {
    if (!data.currentPassword || !data.newPassword) {
      return NextResponse.json({ error: "Ingresa tu contraseña actual y la nueva." }, { status: 400 });
    }
    if (data.newPassword.length < 8) {
      return NextResponse.json({ error: "La nueva contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }
    const ok = await verifyPassword(data.currentPassword, admin.password);
    if (!ok) return NextResponse.json({ error: "Tu contraseña actual no coincide." }, { status: 400 });
    await prisma.adminUser.update({ where: { id: session.id }, data: { password: await hashPassword(data.newPassword) } });
    return NextResponse.json({ ok: true });
  }

  const validation = validateProfileUpdate(data);
  if (validation) return NextResponse.json({ error: validation }, { status: 400 });
  const current = readProfileData(admin.profileData);
  const updateData: Record<string, unknown> = {};
  if (data.fullName !== undefined) updateData.name = data.fullName.trim();
  if (data.phone !== undefined) updateData.phone = data.phone.trim() || null;
  let nextProfile: Record<string, unknown> | null = null;
  if (ALLOWED_FIELDS.some((f) => data[f] !== undefined)) {
    nextProfile = {
      ...current,
      website: data.website ?? "",
      address: data.address ?? "",
      country: data.country ?? "cl",
      bio: data.bio ?? "",
    };
  }
  if (data.notifications !== undefined || data.twoFactorEnabled !== undefined) {
    nextProfile = {
      ...(nextProfile ?? current),
      ...(data.notifications !== undefined
        ? { notifications: { ...readNotifications(admin.profileData), ...data.notifications } }
        : {}),
      ...(data.twoFactorEnabled !== undefined ? { twoFactorEnabled: data.twoFactorEnabled === true } : {}),
    };
  }
  if (nextProfile) updateData.profileData = nextProfile;
  const updated = await prisma.adminUser.update({ where: { id: session.id }, data: updateData });
  const profileData = readProfileData(updated.profileData);
  return NextResponse.json({
    fullName: updated.name ?? "",
    email: updated.email,
    phone: updated.phone ?? "",
    website: profileData.website ?? "",
    address: profileData.address ?? "",
    country: profileData.country ?? "cl",
    bio: profileData.bio ?? "",
    twoFactorEnabled: profileData.twoFactorEnabled === true,
    notifications: readNotifications(updated.profileData),
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