/**
 * Seeds HeroSlide with the 3 slides from StarShop's production frontend mock data.
 * These match the `heroSlides` export in StarShop/src/lib/mock-data.ts,
 * projected through the HeroSlide Prisma model.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const slides = [
  {
    title: "Venta Mayorista B2B",
    subtitle: "Descuentos por volumen hasta 30%",
    description: "Atención a industrias, constructoras y distribuidores",
    cta: "Ser Cliente B2B",
    image: "/b2b.jpg",
    bg: "from-emerald-600 to-teal-700",
    sortOrder: 2,
    active: true,
  },
  {
    title: "Iluminación Industrial LED",
    subtitle: "Hasta 50% OFF + Envío Gratis RM",
    description: "Proyectores, High Bay y alumbrado público certificado SEC",
    cta: "Ver Ofertas",
    image: "/LED.png",
    bg: "from-amber-500 to-orange-600",
    sortOrder: 1,
    active: true,
  },
  {
    title: "Herramientas Profesionales",
    subtitle: "Prensas Hidráulicas 16T desde $89.990",
    description: "Para contratistas y electricistas - Garantía total",
    cta: "Cotizar Ahora",
    image: "/hydraulic.jpg",
    bg: "from-slate-700 to-slate-900",
    sortOrder: 0,
    active: true,
  },
];

async function main() {
  const count = await prisma.heroSlide.count();
  if (count > 0) {
    console.log(`HeroSlide already has ${count} rows — skipping seed.`);
    return;
  }
  for (const s of slides) {
    await prisma.heroSlide.create({ data: s });
  }
  console.log(`Seeded ${slides.length} HeroSlide rows.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
