"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "@tailgrids/icons";
import { Badge } from "@/components/tailgrids/core/badge";

export type CatalogRow = {
  id: string;
  sku: string;
  title: string;
  description: string;
  provider: string;
  price: number;
  stock: number;
  reservedStock: number;
  isActive: boolean;
};

type Props = {
  rows: CatalogRow[];
};

export function CatalogTable({ rows }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const hasOverflow = el.scrollWidth - el.clientWidth > 8;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      setShowHint(hasOverflow && !atEnd);
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
    <div className="relative">
      <div ref={scrollRef} className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-xs text-text-tertiary border-b border-card-border">
            <tr><th className="text-left p-2">SKU</th><th className="text-left p-2">Producto</th><th className="text-left p-2">Proveedor</th><th className="text-right p-2">Precio</th><th className="text-right p-2">Stock</th><th className="text-center p-2">Estado</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-card-border/60 hover:bg-background-gray-secondary">
                <td className="p-2 font-mono text-xs">{p.sku}</td>
                <td className="p-2"><p className="font-medium">{p.title}</p><p className="text-xs text-text-tertiary truncate max-w-[320px]">{p.description}</p></td>
                <td className="p-2"><Badge color="gray">{p.provider}</Badge></td>
                <td className="p-2 text-right">${p.price.toLocaleString("es-CL")}</td>
                <td className="p-2 text-right">{p.stock} <span className="text-xs text-text-tertiary">({p.reservedStock} reservados)</span></td>
                <td className="p-2 text-center"><Badge color={p.isActive ? "success" : "gray"}>{p.isActive ? "Activo" : "Inactivo"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showHint && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 flex items-center bg-gradient-to-l from-card-background via-card-background/70 to-transparent pl-10 pr-1">
          <span className="flex items-center rounded-full border border-card-border bg-card-background p-1.5 shadow-md motion-safe:animate-swipe-hint">
            <ChevronRight className="size-4" />
            <ChevronRight className="-ml-2.5 size-4" />
          </span>
        </div>
      )}
    </div>
  );
}
