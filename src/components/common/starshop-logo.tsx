/**
 * StarShopLogo — logo oficial de la tienda con estrella animada.
 * ST/R se adaptan al tema (negro en claro, casi-blanco en oscuro); SHOP siempre amarillo.
 * El <Link> va en cada uso para no romper la navegación.
 */
import { cn } from "@/utils/cn";

export function StarShopLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  if (compact) {
    return <img src="/star2.svg" alt="StarShop" className="size-9 select-none" />;
  }
  return (
    <span
      translate="no"
      className={cn(
        "starshop-logo notranslate relative inline-flex items-baseline text-[26px] leading-none font-black tracking-tight select-none md:text-[32px]",
        className,
      )}
    >
      <span className="text-black dark:text-white">ST</span>
      <span className="star-slot" aria-hidden="true">
        <span className="star-ghost">A</span>
        <span className="star-float">
          <img src="/star2.svg" alt="" className="star-logo star-anim-show" />
        </span>
      </span>
      <span className="text-black dark:text-white">R</span>
      <span className="text-[#fdd817]">SHOP</span>
    </span>
  );
}
