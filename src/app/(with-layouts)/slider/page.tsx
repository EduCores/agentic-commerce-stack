import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { fetchStarshopSlides } from "@/lib/starshop";
import { SliderManager } from "./_components/slider-manager";

export const dynamic = "force-dynamic";

export default async function SliderPage() {
  const slides = await fetchStarshopSlides().catch(() => []);

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Slider principal", href: "/slider" }]} />
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white">Slider principal del frontend</h2>
        <p className="text-sm text-text-tertiary">
          Administra el carrusel del home de StarShop ({slides.length} slides). Los cambios se reflejan en el frontend al instante.
        </p>
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
