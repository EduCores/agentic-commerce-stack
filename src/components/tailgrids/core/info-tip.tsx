"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import { cn } from "@/utils/cn";
import type { ReactNode } from "react";

type Props = {
  /** Texto guía oculto hasta consulta (acepta formato enriquecido). */
  children: ReactNode;
  label?: string;
  className?: string;
  /** "dark" para usar sobre heroes con gradiente (texto claro). */
  tone?: "light" | "dark";
};

/**
 * Icono de info que revela el texto guía solo para consulta.
 * Despliegue en línea (sin popovers) para no recortarse en ningún contenedor.
 */
export function InfoTip({ children, label = "Ver ayuda", className, tone = "light" }: Props) {
  const [open, setOpen] = useState(false);
  const dark = tone === "dark";
  return (
    <span className={cn("inline-flex min-w-0 flex-col", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={cn(
          "flex size-5 items-center justify-center rounded-full transition [&>svg]:size-4",
          dark ? "text-white/70 hover:text-white" : "text-text-tertiary hover:text-brand-600"
        )}
      >
        {open ? <X /> : <Info />}
      </button>
      {open && (
        <span className={cn("mt-1 block text-xs leading-4", dark ? "text-white/75" : "text-text-tertiary")}>
          {children}
        </span>
      )}
    </span>
  );
}
