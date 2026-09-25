"use client";

import { Button } from "@/components/tailgrids/core/button";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardContent } from "@/components/tailgrids/core/card";
import { InfoTip } from "@/components/tailgrids/core/info-tip";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@/components/tailgrids/core/input-group";
import { Label } from "@/components/tailgrids/core/label";
import { Backdrop, OverlayWrapper } from "@/components/tailgrids/core/overlay";
import { TextField } from "@/components/tailgrids/core/text-field";
import { Eye, EyeDisabled } from "@tailgrids/icons";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FieldError, Form } from "react-aria-components";
import { toast } from "sonner";
import { securityItems } from "./data";

type Me = { email: string; name: string | null; role: string };

function useSecurityState() {
  const [email, setEmail] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [p, m] = await Promise.all([
        fetch("/api/profile").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
      ]);
      if (p) {
        setEmail(p.email ?? "");
        setTwoFactorEnabled(p.twoFactorEnabled === true);
      }
      if (m?.admin) setMe(m.admin);
    } catch {
      // sin sesión: la página igual renderiza
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return { email, twoFactorEnabled, setTwoFactorEnabled, me, refresh };
}

export default function SecurityTabContent() {
  const router = useRouter();
  const { email, twoFactorEnabled, setTwoFactorEnabled, me, refresh } = useSecurityState();

  const [pwdOpen, setPwdOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [savingPwd, setSavingPwd] = useState(false);

  const [twofaOpen, setTwofaOpen] = useState(false);
  const [twofaMode, setTwofaMode] = useState<"enable" | "disable">("enable");
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [sessionOpen, setSessionOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (next !== confirm) {
      toast.error("La confirmación no coincide.");
      return;
    }
    setSavingPwd(true);
    try {
      const r = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo actualizar.");
      toast.success("Contraseña actualizada.");
      setPwdOpen(false);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar.");
    } finally {
      setSavingPwd(false);
    }
  }

  async function sendCode() {
    setCodeMsg("");
    setSendingCode(true);
    try {
      const r = await fetch("/api/auth/2fa/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error");
      setCodeMsg(j.debugCode ? `Código de prueba (dev): ${j.debugCode}` : "Código enviado a tu correo (5 min).");
    } catch (err) {
      setCodeMsg(err instanceof Error ? err.message : "No se pudo enviar el código.");
    } finally {
      setSendingCode(false);
    }
  }

  function openTwofa(mode: "enable" | "disable") {
    setTwofaMode(mode);
    setCode("");
    setCodeMsg("");
    setTwofaOpen(true);
    if (mode === "enable") sendCode();
  }

  async function verifyAndEnable(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    try {
      const r = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Código inválido.");
      const p = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twoFactorEnabled: true }),
      });
      if (!p.ok) throw new Error("No se pudo activar.");
      setTwoFactorEnabled(true);
      toast.success("Verificación en dos pasos activada.");
      setTwofaOpen(false);
      setCode("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo activar.");
    } finally {
      setVerifying(false);
    }
  }

  async function disableTwofa() {
    setVerifying(true);
    try {
      const r = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twoFactorEnabled: false }),
      });
      if (!r.ok) throw new Error("No se pudo desactivar.");
      setTwoFactorEnabled(false);
      toast.success("Verificación en dos pasos desactivada.");
      setTwofaOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo desactivar.");
    } finally {
      setVerifying(false);
    }
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // igual redirige
    } finally {
      router.push("/auth/sign-in");
      router.refresh();
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <h2 className="text-xl leading-7 font-semibold text-text-primary">Seguridad</h2>
        <InfoTip label="Acerca de seguridad">Contraseña, segundo factor y tu sesión actual — todo funcional.</InfoTip>
      </div>

      <Card className="mt-6">
        <CardContent className="!py-2">
          <div className="divide-y divide-card-border">
        {securityItems.map(({ key, icon: Icon, title, description, color }) => (
          <div
            key={key}
            className="flex min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
                <Icon />
              </div>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm leading-5 font-medium text-text-primary">
                  {title}
                  {key === "2fa" && (
                    <Badge color={twoFactorEnabled ? "success" : "gray"}>{twoFactorEnabled ? "Activado" : "Desactivado"}</Badge>
                  )}
                </p>
                <p className="mt-1 text-xs leading-4 text-text-tertiary">{description}</p>
              </div>
            </div>

            {key === "password" && (
              <Button type="button" appearance="fill" size="sm" className="shrink-0" onClick={() => setPwdOpen(true)}>
                Cambiar
              </Button>
            )}
            {key === "2fa" && (
              <Button
                type="button"
                appearance="fill"
                size="sm"
                className="shrink-0"
                onClick={() => openTwofa(twoFactorEnabled ? "disable" : "enable")}
              >
                {twoFactorEnabled ? "Desactivar" : "Activar"}
              </Button>
            )}
            {key === "session" && (
              <Button type="button" appearance="fill" size="sm" className="shrink-0" onClick={() => setSessionOpen(true)}>
                Ver
              </Button>
            )}
          </div>
        ))}
          </div>
        </CardContent>
      </Card>

      {/* Cambiar contraseña — real vía PATCH /api/profile */}
      <OverlayWrapper isOpen={pwdOpen} onOpenChange={setPwdOpen}>
        <Backdrop isDismissable>
          <Dialog className="max-w-108.75 p-0">
            <Form onSubmit={submitPassword}>
              <DialogHeader className="gap-1 border-b border-card-border py-4 pr-14 pl-5">
                <DialogTitle className="text-xl leading-7">Actualizar contraseña</DialogTitle>
                <DialogDescription className="text-text-tertiary">
                  Te pedimos la actual para confirmar que eres tú
                </DialogDescription>
              </DialogHeader>

              <DialogBody className="space-y-4 px-5 py-4">
                {(
                  [
                    ["current", "Contraseña actual", "Ingresa tu contraseña actual", current, setCurrent, "current-password"],
                    ["next", "Nueva contraseña", "Mínimo 8 caracteres", next, setNext, "new-password"],
                    ["confirm", "Confirmar contraseña nueva", "Reingresa tu contraseña nueva", confirm, setConfirm, "new-password"],
                  ] as const
                ).map(([k, label, placeholder, value, setter, auto]) => (
                  <TextField key={k} className="gap-1.5">
                    <Label htmlFor={`pwd-${k}`}>{label}</Label>
                    <InputGroup>
                      <InputGroupInput
                        id={`pwd-${k}`}
                        type={show[k] ? "text" : "password"}
                        placeholder={placeholder}
                        autoComplete={auto}
                        required
                        value={value}
                        onChange={(e) => setter(e.target.value)}
                      />
                      <InputGroupButton
                        size="icon-sm"
                        className="mr-1"
                        onPress={() => setShow((s) => ({ ...s, [k]: !s[k] }))}
                        aria-label={show[k] ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {show[k] ? <EyeDisabled className="size-5" /> : <Eye className="size-5" />}
                      </InputGroupButton>
                    </InputGroup>
                    <FieldError />
                  </TextField>
                ))}
              </DialogBody>

              <DialogFooter className="border-t border-card-border px-5 py-4">
                <DialogClose variant="ghost" size="lg">
                  Cancelar
                </DialogClose>
                <Button type="submit" size="lg" className="px-3.5 text-sm" isDisabled={savingPwd}>
                  {savingPwd ? "Guardando…" : "Aplicar cambios"}
                </Button>
              </DialogFooter>
            </Form>
          </Dialog>
        </Backdrop>
      </OverlayWrapper>

      {/* 2FA — activar con código real / desactivar con confirmación */}
      <OverlayWrapper isOpen={twofaOpen} onOpenChange={setTwofaOpen}>
        <Backdrop isDismissable>
          <Dialog className="max-w-108.75 p-0">
            {twofaMode === "enable" ? (
              <Form onSubmit={verifyAndEnable}>
                <DialogHeader className="gap-1 border-b border-card-border py-4 pr-14 pl-5">
                  <DialogTitle className="text-xl leading-7">Activar verificación en dos pasos</DialogTitle>
                  <DialogDescription className="text-text-tertiary">
                    Enviamos un código a {email || "tu correo"} — ingrésalo para activar
                  </DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-4 px-5 py-4">
                  <TextField className="gap-1.5">
                    <Label htmlFor="2fa-code">Código de 6 dígitos</Label>
                    <InputGroup>
                      <InputGroupInput
                        id="2fa-code"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="••••••"
                        className="text-center text-lg font-bold tracking-[0.3em]"
                      />
                    </InputGroup>
                    <FieldError />
                  </TextField>
                  {codeMsg && <p className="text-xs text-text-secondary">{codeMsg}</p>}
                  <button type="button" onClick={sendCode} disabled={sendingCode} className="text-xs font-medium text-brand-600 underline disabled:opacity-50">
                    {sendingCode ? "Enviando…" : "Reenviar código"}
                  </button>
                </DialogBody>
                <DialogFooter className="border-t border-card-border px-5 py-4">
                  <DialogClose variant="ghost" size="lg">
                    Cancelar
                  </DialogClose>
                  <Button type="submit" size="lg" className="px-3.5 text-sm" isDisabled={verifying || code.length !== 6}>
                    {verifying ? "Verificando…" : "Activar"}
                  </Button>
                </DialogFooter>
              </Form>
            ) : (
              <>
                <DialogHeader className="gap-1 border-b border-card-border py-4 pr-14 pl-5">
                  <DialogTitle className="text-xl leading-7">Desactivar verificación en dos pasos</DialogTitle>
                  <DialogDescription className="text-text-tertiary">
                    Tu cuenta volverá a entrar solo con correo y contraseña
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="border-t border-card-border px-5 py-4">
                  <DialogClose variant="ghost" size="lg">
                    Cancelar
                  </DialogClose>
                  <Button type="button" variant="danger" appearance="fill" size="lg" className="px-3.5 text-sm" onClick={disableTwofa} isDisabled={verifying}>
                    {verifying ? "Procesando…" : "Desactivar"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </Dialog>
        </Backdrop>
      </OverlayWrapper>

      {/* Sesión actual — datos reales de /api/auth/me */}
      <OverlayWrapper isOpen={sessionOpen} onOpenChange={setSessionOpen}>
        <Backdrop isDismissable>
          <Dialog className="max-w-108.75 p-0">
            <DialogHeader className="gap-1 border-b border-card-border py-4 pr-14 pl-5">
              <DialogTitle className="text-xl leading-7">Sesión actual</DialogTitle>
              <DialogDescription className="text-text-tertiary">
                Así estás conectado ahora mismo
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-2 px-5 py-4 text-sm">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-card-border/60 px-3 py-2">
                <span className="text-text-tertiary">Cuenta</span>
                <span className="min-w-0 truncate font-medium text-text-primary">{me?.email ?? email ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-card-border/60 px-3 py-2">
                <span className="text-text-tertiary">Nombre</span>
                <span className="min-w-0 truncate font-medium text-text-primary">{me?.name ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-card-border/60 px-3 py-2">
                <span className="text-text-tertiary">Rol</span>
                <Badge color="primary">{me?.role ?? "—"}</Badge>
              </div>
              <p className="text-xs text-text-tertiary">Las sesiones usan token firmado de 7 días en este navegador.</p>
            </DialogBody>
            <DialogFooter className="border-t border-card-border px-5 py-4">
              <DialogClose variant="ghost" size="lg">
                Cerrar
              </DialogClose>
              <Button type="button" variant="danger" appearance="outline" size="lg" className="px-3.5 text-sm" onClick={logout} isDisabled={loggingOut}>
                {loggingOut ? "Saliendo…" : "Cerrar sesión"}
              </Button>
            </DialogFooter>
          </Dialog>
        </Backdrop>
      </OverlayWrapper>
    </div>
  );
}
