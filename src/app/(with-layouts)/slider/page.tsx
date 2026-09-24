import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { InfoTip } from "@/components/tailgrids/core/info-tip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { prisma } from "@/lib/adapters/prisma";
import { SliderManager } from "./_components/slider-manager";

export const dynamic = "force-dynamic";

// Origen público del storefront: resuelve imágenes relativas (/b2b.jpg)
// a URL absoluta para que el thumb cargue en el panel admin.
function resolveImage(image: string): string {
  if (!image) return image;
  if (/^(https?:|data:|blob:)/i.test(image)) return image;
  const origin = (process.env.STARSHOP_PUBLIC_ORIGIN ?? "https://starshop-rho.vercel.app").replace(/\/$/, "");
  return `${origin}${image.startsWith("/") ? image : `/${image}`}`;
}

export default async function SliderPage() {
  const rows = await prisma.heroSlide
    .findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] })
    .catch(() => []);
  const slides = rows.map((s) => ({ ...s, image: resolveImage(s.image) }));
  const activeCount = rows.filter((s) => s.active).length;
  const storeOrigin = (process.env.STARSHOP_PUBLIC_ORIGIN ?? "https://starshop-rho.vercel.app").replace(/\/$/, "");

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Slider principal", href: "/slider" }]} />
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-black dark:text-white">Slider principal del frontend</h2>
        <InfoTip label="Acerca del slider">
          Administra el carrusel del home de StarShop ({rows.length} slides, {activeCount} publicados).{" "}
          <a href={`${storeOrigin}/`} target="_blank" rel="noopener noreferrer" className="underline hover:text-text-primary">
            Ver en la tienda →
          </a>
        </InfoTip>
      </div>

      <Card>
        <CardHeader><CardTitle>Slides ({slides.length})</CardTitle></CardHeader>
        <CardContent>
          <SliderManager initialSlides={slides} />
        </CardContent>
      </Card>
    </div>
  );
}

