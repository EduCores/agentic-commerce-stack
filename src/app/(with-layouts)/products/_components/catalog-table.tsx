"use client";

import { Copy1 } from "@tailgrids/icons";
import { Badge } from "@/components/tailgrids/core/badge";
import { Button } from "@/components/tailgrids/core/button";
import { ScrollHint } from "@/components/tailgrids/core/scroll-hint";
import { Package } from "lucide-react";
import { toast } from "sonner";

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
  const copySku = async (sku: string) => {
    try {
      await navigator.clipboard.writeText(sku);
      toast.success("SKU copiado.");
    } catch {
      toast.error("No se pudo copiar el SKU.");
    }
  };

  return (
    <ScrollHint>
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-card-border bg-background-gray-secondary/50 text-xs text-text-tertiary">
            <tr><th className="p-2 text-left" style={{ width: "4%" }}>SKU</th><th className="p-2 text-left">Producto</th><th className="p-2 text-left">Proveedor</th><th className="p-2 text-right">Precio</th><th className="p-2 text-right">Stock</th><th className="p-2 text-center">Estado</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const stockColor = p.stock <= 0 ? "bg-red-500" : p.stock < 10 ? "bg-teal-500" : "bg-emerald-500";
              const providerColor: "success" | "primary" | "warning" | "gray" | "sky" =
                p.provider === "shopify" ? "success" : p.provider === "woocommerce" ? "primary" : p.provider === "magento" ? "warning" : p.provider === "custom" ? "sky" : "gray";
              return (
                <tr key={p.id} className="border-b border-card-border/60 transition hover:bg-background-gray-secondary/60">
                  <td className="p-2">
  <div className="flex max-w-[72px] items-center gap-1">
    <span className="truncate font-mono text-xs text-text-secondary" title={p.sku}>{p.sku}</span>
    <Button
      type="button"
      variant="ghost"
      appearance="ghost"
      iconOnly
      size="xs"
      className="h-5 w-5 shrink-0 rounded p-0"
      aria-label={`Copiar SKU ${p.sku}`}
      onPress={() => copySku(p.sku)}
    >
      <Copy1 className="size-3.5" />
    </Button>
  </div>
</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-badge-sky-background text-badge-sky-text [&>svg]:size-3.5">
                        <Package />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-text-primary">{p.title}</p>
                        <p className="truncate text-xs text-text-tertiary max-w-[280px]">{p.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-2"><Badge color={providerColor}>{p.provider}</Badge></td>
                  <td className="p-2 text-right font-bold text-brand-600">${p.price.toLocaleString("es-CL")}</td>
                  <td className="p-2 text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`size-2 rounded-full ${stockColor}`} />
                      <span className="font-medium">{p.stock}</span>
                      <span className="text-xs text-text-tertiary">({p.reservedStock} res.)</span>
                    </span>
                  </td>
                  <td className="p-2 text-center"><Badge color={p.isActive ? "success" : "gray"}>{p.isActive ? "Activo" : "Inactivo"}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
    </ScrollHint>
  );
}
