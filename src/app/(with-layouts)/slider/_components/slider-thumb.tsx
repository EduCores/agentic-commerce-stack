"use client";

import { ArrowRight, Eye, Pencil1, Send1, Trash1 } from "@tailgrids/icons";
import { Button } from "@/components/tailgrids/core/button";
import { Badge } from "@/components/tailgrids/core/badge";
import type { Slide } from "./slider-manager";

export interface SliderThumbProps {
  slide: Slide;
  onViewStore?: (slide: Slide) => void;
  onEdit?: (slide: Slide) => void;
  onTogglePublish?: (slide: Slide) => void;
  onDelete?: (slide: Slide) => void;
}

/**
 * Miniatura visual del slide tal como aparece en el frontend de StarShop.
 * Muestra imagen, título, subtítulo, descripción, CTA y botones de interacción.
 */
export function SliderThumb({ slide, onViewStore, onEdit, onTogglePublish, onDelete }: SliderThumbProps) {
  const origin = (process.env.NEXT_PUBLIC_STARSHOP_ORIGIN ?? "https://starshop-rho.vercel.app").replace(/\/$/, "");
  const storeHref = `${origin}/`;

  return (
    <div className="flex w-full shrink-0 flex-col gap-2 overflow-hidden rounded-xl border border-card-border bg-card-background">
      {/* Imagen / gradiente de fondo */}
      <div
        className={`relative aspect-[16/9] w-full overflow-hidden rounded-t-xl bg-gradient-to-r ${slide.bg || "from-slate-700 to-slate-900"}`}
      >
        {slide.image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.image}
              alt={slide.title}
              className="absolute inset-0 h-full w-full object-cover mix-blend-multiply opacity-60"
            />
          </>
        ) : (
          <div className="absolute inset-0 flex h-full w-full items-center justify-center text-sm text-text-tertiary">
            Sin imagen
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-center p-4 text-white">
          {slide.subtitle && (
            <span className="animate-pulse inline-block w-fit bg-white/20 backdrop-blur rounded px-2 py-0.5 text-xs font-bold mb-2">
              🔥 {slide.subtitle}
            </span>
          )}
          <h3 className="text-xl font-black leading-tight sm:text-2xl">{slide.title || "Sin título"}</h3>
          {slide.description && (
            <p className="mt-1 hidden text-sm text-white/80 md:block">{slide.description}</p>
          )}
          {slide.cta && (
            <button
              type="button"
              onClick={() => onViewStore?.(slide)}
              className="mt-3 w-fit rounded-[4px] border border-white bg-white px-4 py-1.5 text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              {slide.cta}
            </button>
          )}
        </div>

      </div>

      {/* Acciones siempre visibles encima de los nombres */}
      <div className="flex items-center gap-1 px-3">
        <Badge color={slide.active ? "success" : "gray"} size="sm">
          {slide.active ? "Publicado" : "Borrador"}
        </Badge>
        <span className="ml-auto flex items-center gap-1">
          <Button
            size="xs"
            appearance="ghost"
            variant="ghost"
            iconOnly
            onClick={() => onViewStore?.(slide)}
            aria-label="Ver en la tienda"
          >
            <Eye />
          </Button>
          <Button
            size="xs"
            appearance="ghost"
            variant="ghost"
            iconOnly
            onClick={() => onEdit?.(slide)}
            aria-label="Editar"
          >
            <Pencil1 />
          </Button>
          <Button
            size="xs"
            appearance="ghost"
            variant="ghost"
            iconOnly
            onClick={() => onTogglePublish?.(slide)}
            aria-label={slide.active ? "Despublicar" : "Publicar"}
          >
            <Send1 className={slide.active ? "rotate-0" : "rotate-180"} />
          </Button>
          <Button
            size="xs"
            appearance="ghost"
            variant="danger"
            iconOnly
            onClick={() => onDelete?.(slide)}
            aria-label="Eliminar"
          >
            <Trash1 />
          </Button>
        </span>
      </div>

      {/* Footer con info resumida */}
      <div className="px-3 pb-3">
        <p className="truncate text-sm font-semibold text-text-primary">#{slide.sortOrder} · {slide.title || "Sin título"}</p>
        <p className="truncate text-xs text-text-secondary">Orden: {slide.sortOrder}</p>
        <a
          href={storeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary"
          onClick={() => onViewStore?.(slide)}
        >
          Ver en la tienda
          <ArrowRight className="h-3 w-3 shrink-0" />
        </a>
      </div>
    </div>
  );
}
