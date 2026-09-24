"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight } from "@tailgrids/icons";
import { cn } from "@/utils/cn";

type Props = {
  children: ReactNode;
  className?: string;
  label?: string;
};

/**
 * Contenedor con scroll horizontal + flechita > a la derecha como indicador.
 * La flecha se oculta sola al llegar al final. Úsalo en tablas y listas
 * anchas en vez de un overflow-x-auto pelado.
 */
export function ScrollHint({ children, className, label = "Desliza para ver más" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setShow(el.scrollWidth - el.clientWidth > 8 && el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="relative min-w-0">
      <div ref={ref} className={cn("overflow-x-auto", className)}>
        {children}
      </div>
      {show && (
        <div
          aria-hidden="true"
          title={label}
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center bg-gradient-to-l from-card-background via-card-background/70 to-transparent pl-10 pr-1"
        >
          <span className="flex items-center rounded-full border border-card-border bg-card-background p-1.5 shadow-md motion-safe:animate-swipe-hint">
            <ChevronRight className="size-4" />
          </span>
        </div>
      )}
    </div>
  );
}
