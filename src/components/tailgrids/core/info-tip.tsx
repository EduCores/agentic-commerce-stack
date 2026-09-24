"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import { cn } from "@/utils/cn";
import type { ReactNode } from "react";

type Props = {
  /** Info que muestra el globo (acepta formato enriquecido). */
  children: ReactNode;
  label?: string;
  className?: string;
  /** "dark" cuando el icono va sobre un hero con gradiente. */
  tone?: "light" | "dark";
};

const BALLOON_W = 288;

/**
 * Icono ⓘ con globo de ayuda: aparece ARRIBA del icono al hover o clic,
 * se eleva suavemente y se desvanece al salir, con Escape o tocando fuera.
 * Portal a body: nunca lo recorta ningún contenedor.
 */
export function InfoTip({ children, label = "Ver ayuda", className, tone = "light" }: Props) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const balloonRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const uid = useId();
  const dark = tone === "dark";

  const compute = useCallback(() => {
    const el = btnRef.current;
    if (!el || typeof window === "undefined") return;
    const r = el.getBoundingClientRect();
    const w = Math.min(BALLOON_W, window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8));
    if (r.top >= 280) {
      setPos({ bottom: Math.max(8, window.innerHeight - r.top + 10), left });
    } else {
      setPos({ top: Math.max(8, Math.min(r.bottom + 10, window.innerHeight - 90)), left });
    }
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openTip = useCallback(() => {
    cancelClose();
    compute();
    setOpen(true);
    setVisible(true);
  }, [cancelClose, compute]);

  const closeTip = useCallback(
    (delay = 0) => {
      cancelClose();
      if (delay <= 0) {
        setVisible(false);
        setOpen(false);
        return;
      }
      setVisible(false);
      closeTimer.current = window.setTimeout(() => {
        setOpen(false);
        closeTimer.current = null;
      }, 200);
    },
    [cancelClose]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTip();
    };
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (t && btnRef.current?.contains(t)) return;
      if (t && balloonRef.current?.contains(t)) return;
      closeTip();
    };
    const onScrollResize = () => compute();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [open, compute, closeTip]);

  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    []
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-label={label}
        title={label}
        aria-describedby={open ? `${uid}-tip` : undefined}
        onMouseEnter={openTip}
        onMouseLeave={() => closeTip(150)}
        onFocus={openTip}
        onBlur={() => closeTip(150)}
        onClick={() => (open ? closeTip() : openTip())}
        className={cn(
          "inline-flex size-5 shrink-0 items-center justify-center rounded-full transition [&>svg]:size-4",
          dark ? "text-white/70 hover:text-white" : "text-text-tertiary hover:text-brand-600",
          className
        )}
      >
        {open ? <X /> : <Info />}
      </button>
      {open && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={balloonRef}
            id={`${uid}-tip`}
            role="tooltip"
            onMouseEnter={openTip}
            onMouseLeave={() => closeTip(150)}
            style={pos ? { left: pos.left, ...(pos.bottom !== undefined ? { bottom: pos.bottom } : { top: pos.top }) } : { visibility: "hidden" }}
            className={cn(
              "fixed z-[100] w-72 max-w-[calc(100vw-16px)] rounded-xl border border-card-border bg-card-background p-3 shadow-xl transition-all duration-200",
              visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            )}
          >
            <div className="text-xs leading-4 text-text-secondary">{children}</div>
          </div>,
          document.body
        )}
    </>
  );
}
