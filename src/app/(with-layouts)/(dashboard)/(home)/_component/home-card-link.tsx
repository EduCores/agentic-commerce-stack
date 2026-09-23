import Link from "next/link";
import type { ReactNode } from "react";
import { buttonStyles } from "@/components/tailgrids/core/button";
import { cn } from "@/utils/cn";

type Props = {
  href: string;
  children: ReactNode;
  size?: "sm" | "md";
  className?: string;
};

/** Enlace de tarjeta con el estilo exacto del botón Editar (primary / outline). */
export function HomeCardLink({ href, children, size = "md", className }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        buttonStyles({ variant: "primary", appearance: "outline", size }),
        "mt-3 w-full",
        className,
      )}
    >
      {children}
    </Link>
  );
}
