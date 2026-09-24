"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/tailgrids/core/avatar";
import { Button } from "@/components/tailgrids/core/button";
import { Card, CardContent } from "@/components/tailgrids/core/card";
import { Form } from "react-aria-components";
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/tailgrids/core/dialog";
import { TextField } from "@/components/tailgrids/core/text-field";
import { Input } from "@/components/tailgrids/core/input";
import { Label } from "@/components/tailgrids/core/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectIndicator,
} from "@/components/tailgrids/core/select";
import { TextArea } from "@/components/tailgrids/core/text-area";
import { TrashIcon } from "./icons";

const countryOptions = [
  { value: "cl", label: "Chile" },
  { value: "ar", label: "Argentina" },
  { value: "pe", label: "Perú" },
  { value: "co", label: "Colombia" },
  { value: "mx", label: "México" },
  { value: "us", label: "Estados Unidos" },
];

type FieldState = {
  fullName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  country: string;
  bio: string;
};

const DEFAULT_FIELDS: FieldState = {
  fullName: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  country: "cl",
  bio: "",
};

type DeleteConfirmState = {
  isOpen: boolean;
  email: string;
  confirmed: boolean;
};

function validateForm(fields: FieldState): string | null {
  if (!fields.fullName.trim()) return "El nombre completo es obligatorio.";
  if (!fields.email.trim()) return "El correo electrónico es obligatorio.";
  if (fields.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))
    return "Ingresa un correo válido.";
  if (fields.phone.trim() && !/^[\d\s\+\-\(\)]{7,20}$/.test(fields.phone))
    return "Número de teléfono inválido.";
  return null;
}

function makeInitials(fullName: string): string {
  return fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AccountPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState<FieldState>(DEFAULT_FIELDS);
  const [originalFields, setOriginalFields] = useState<FieldState>(DEFAULT_FIELDS);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    isOpen: false,
    email: "",
    confirmed: false,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          toast.error("No se pudieron cargar los datos de la cuenta.");
          return;
        }
        const data = await res.json();
        const loaded: FieldState = {
          fullName: data.fullName ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          website: data.website ?? "",
          address: data.address ?? "",
          country: data.country ?? "cl",
          bio: data.bio ?? "",
        };
        setFields(loaded);
        setOriginalFields(loaded);
      } catch {
        const mock: FieldState = {
          fullName: "Juan Pérez",
          email: "juan.perez@starshop.cl",
          phone: "+56 9 1234 5678",
          website: "www.starshop.cl",
          address: "Av. Providencia 1208, Providencia, Santiago",
          country: "cl",
          bio: "Dueño de StarShop en Santiago. Venta mayorista de herramientas e iluminación LED a lo largo de Chile.",
        };
        setFields(mock);
        setOriginalFields(mock);
      }
    };
    load();
  }, []);

  const hasChanges = useMemo(
    () => JSON.stringify(fields) !== JSON.stringify(originalFields),
    [fields, originalFields],
  );

  const handleFieldChange = useCallback(
    (field: keyof FieldState) => (value: string) => {
      setFields((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleCancel = useCallback(() => {
    setFields(originalFields);
    formRef.current?.reset();
  }, [originalFields]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateForm(fields);
    if (error) {
      toast.error(error);
      return;
    }
    if (!hasChanges) {
      toast.info("No hay cambios para guardar.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const updated = await res.json();
      setOriginalFields(updated);
      toast.success("Cuenta actualizada correctamente.");
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      toast.error("No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOpen = useCallback(() => {
    setDeleteConfirm((prev) => ({
      ...prev,
      isOpen: true,
      email: "",
      confirmed: false,
    }));
  }, []);

  const handleDeleteClose = useCallback(() => {
    setDeleteConfirm({
      isOpen: false,
      email: "",
      confirmed: false,
    });
  }, []);

  const handleDeleteSubmit = async () => {
    if (deleteConfirm.email.toLowerCase() !== fields.email.toLowerCase()) {
      toast.error("El correo no coincide. Por favor verifica e inténtalo de nuevo.");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: deleteConfirm.email }),
      });
      if (!res.ok) throw new Error("Error al eliminar");
      toast.success("Cuenta eliminada permanentemente.");
      setFields(DEFAULT_FIELDS);
      setOriginalFields(DEFAULT_FIELDS);
      handleDeleteClose();
    } catch {
      toast.error("No se pudo eliminar la cuenta. Inténtalo de nuevo.");
    } finally {
      setDeleting(false);
    }
  };

  const initials = useMemo(() => makeInitials(fields.fullName || "Usuario"), [fields.fullName]);

  return (
    <div className="min-w-0 space-y-6">
      <div className="min-w-0">
        <h2 className="text-xl leading-7 font-semibold text-text-primary">Cuenta</h2>
        <p className="mt-1 text-sm text-text-tertiary">Tus datos personales y de contacto — se guardan en tu cuenta.</p>
      </div>
      <Card>
        <CardContent className="flex flex-col gap-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative size-16 shrink-0 rounded-full bg-primary-100 flex items-center justify-center ring-2 ring-primary-500/20">
              <Avatar>
                <AvatarFallback className="text-lg font-semibold text-primary-500">{initials}</AvatarFallback>
              </Avatar>
              <span className="absolute -right-0.5 -bottom-0.5 size-4 rounded-full border-2 border-card-background bg-emerald-500" title="Cuenta activa" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-text-primary">{fields.fullName || "Usuario"}</h3>
              <p className="truncate text-sm text-text-secondary-alt">{fields.email}</p>
            </div>
          </div>

          <Form ref={formRef} onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField className="flex flex-col gap-1.5">
                <Label htmlFor="fullName">Nombre completo</Label>
                <Input
                  id="fullName"
                  value={fields.fullName}
                  onChange={(e) => handleFieldChange("fullName")(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  required
                />
              </TextField>

              <TextField className="flex flex-col gap-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={fields.email}
                  onChange={(e) => handleFieldChange("email")(e.target.value)}
                  placeholder="ejemplo@dominio.com"
                  required
                />
              </TextField>

              <TextField className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={fields.phone}
                  onChange={(e) => handleFieldChange("phone")(e.target.value)}
                  placeholder="+56 9 1234 5678"
                />
              </TextField>

              <TextField className="flex flex-col gap-1.5">
                <Label htmlFor="website">Sitio web</Label>
                <Input
                  id="website"
                  type="url"
                  value={fields.website}
                  onChange={(e) => handleFieldChange("website")(e.target.value)}
                  placeholder="www.ejemplo.cl"
                />
              </TextField>

              <TextField className="md:col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={fields.address}
                  onChange={(e) => handleFieldChange("address")(e.target.value)}
                  placeholder="Av. Providencia 1208, Santiago"
                />
              </TextField>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="country">País</Label>
                <Select
                  value={fields.country}
                  onChange={(v) => handleFieldChange("country")(String(v))}
                  aria-label="País"
                >
                  <SelectTrigger>
                    <SelectValue />
                    <SelectIndicator />
                  </SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((option) => (
                      <SelectItem key={option.value} id={option.value} textValue={option.label}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <TextField className="md:col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="bio">Biografía</Label>
                <TextArea
                  id="bio"
                  value={fields.bio}
                  onChange={(e) => handleFieldChange("bio")(e.target.value)}
                  placeholder="Cuéntanos sobre ti..."
                  rows={4}
                />
              </TextField>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-card-border pt-4">
              <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-text-tertiary" aria-live="polite">
                {saving ? (
                  "Guardando…"
                ) : hasChanges ? (
                  <>
                    <span className="size-1.5 shrink-0 rounded-full bg-amber-500" /> Cambios sin guardar
                  </>
                ) : (
                  <>
                    <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" /> Todo guardado
                  </>
                )}
              </span>
              <span className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onPress={handleCancel}
                  isDisabled={saving}
                >
                  Cancelar
                </Button>
                <Button type="submit" isDisabled={saving || !hasChanges}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </span>
            </div>
          </Form>

          <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-red-200 bg-red-50/60 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-red-900/40 dark:bg-red-950/20">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 [&>svg]:size-4">
                <TrashIcon />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">Zona de peligro</p>
                <p className="truncate text-xs text-text-tertiary">Eliminar tu cuenta es permanente y no se puede deshacer</p>
              </div>
            </div>
            <Button
              type="button"
              variant="danger"
              appearance="outline"
              size="sm"
              onPress={handleDeleteOpen}
              className="shrink-0"
            >
              Eliminar cuenta
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        isOpen={deleteConfirm.isOpen}
        onOpenChange={(open) =>
          setDeleteConfirm((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleDeleteSubmit(); }}>
          <DialogTitle>Eliminar cuenta</DialogTitle>
          <DialogDescription>
            Esta acción eliminará permanentemente tu cuenta. Introduce tu correo para confirmar.
          </DialogDescription>
          <DialogBody>
            <TextField className="flex flex-col gap-1.5">
              <Label htmlFor="delete-email">Correo electrónico</Label>
              <Input
                id="delete-email"
                type="email"
                value={deleteConfirm.email}
                onChange={(e) => setDeleteConfirm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="tu@email.com"
                required
              />
            </TextField>
          </DialogBody>
          <DialogFooter>
            <DialogClose variant="ghost" size="lg">
              Cancelar
            </DialogClose>
            <Button type="submit" variant="danger" appearance="fill" size="lg" isDisabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar cuenta"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}