// ACS — Catálogo de referencia StarShop (fallback cuando la tienda no tiene productos).
// Compartido por prisma/seed.ts y prisma/seed-demo.ts.

export type SeedProduct = {
  sku: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  categoria: string;
  categorySlug: string;
  aliases: string[];
  tags: string[];
};

export const fallbackProducts: SeedProduct[] = [
  {
    sku: "PROY-LED-200W",
    title: "Proyector LED 200W IP66",
    description: "Proyector LED de 200W, IP66, para exteriores, fachadas y obras.",
    price: 54990,
    stock: 36,
    categoria: "Iluminación LED y Neón",
    categorySlug: "iluminacion-led-neon",
    aliases: ["reflector led", "luces de obra", "spot exterior", "luz de fachada"],
    tags: ["led", "200w", "ip66", "exterior", "obra"],
  },
  {
    sku: "TALADRO-13MM",
    title: "Taladro Percutor 13mm 750W",
    description: "Taladro percutor 13mm, 750W, para hormigón, madera y metal.",
    price: 45990,
    stock: 28,
    categoria: "Herramientas y Maquinarias",
    categorySlug: "herramientas-maquinarias",
    aliases: ["taladradora", "drill percutor", "perforadora"],
    tags: ["taladro", "percutor", "13mm", "750w"],
  },
  {
    sku: "MULTIMETRO-DT9205A",
    title: "Multímetro Digital DT9205A",
    description: "Multímetro digital con medición de voltaje CA/CC y resistencia.",
    price: 12990,
    stock: 70,
    categoria: "Instrumentos de Medición",
    categorySlug: "instrumentos-medicion",
    aliases: ["tester digital", "multitester", "polimetro"],
    tags: ["multimetro", "tester", "digital", "voltaje"],
  },
  {
    sku: "TUBO-UV-120",
    title: "Tubo UV T8 120cm 36W",
    description: "Tubo UV T8 de 120cm, 36W, radiación ultravioleta para curado y efectos.",
    price: 11990,
    stock: 54,
    categoria: "Tubos y Lámparas Especiales",
    categorySlug: "tubos-lamparas-especiales",
    aliases: ["lampara uv", "luz ultravioleta", "luz negra"],
    tags: ["tubo", "uv", "36w", "ultravioleta"],
  },
  {
    sku: "PANEL-LED-60X60",
    title: "Panel LED Plafón 60x60cm 40W",
    description: "Panel LED para cielos empotrados 60x60cm, 40W, luz neutra.",
    price: 18990,
    stock: 60,
    categoria: "Iluminación LED y Neón",
    categorySlug: "iluminacion-led-neon",
    aliases: ["panel plafon", "luminaria empotrable", "panel cielo"],
    tags: ["panel", "plafon", "40w", "empotrado"],
  },
  {
    sku: "AMOLADORA-115",
    title: "Amoladora Angular 115mm 850W",
    description: "Amoladora angular 115mm, 850W, para corte y desbaste de metal.",
    price: 38990,
    stock: 32,
    categoria: "Herramientas y Maquinarias",
    categorySlug: "herramientas-maquinarias",
    aliases: ["esmeril angular", "radial 115", "moladora"],
    tags: ["amoladora", "radial", "115mm", "850w"],
  },
  {
    sku: "PINZA-AMP-600A",
    title: "Pinza Amperimétrica 600A AC",
    description: "Pinza amperimétrica digital 600A CA, mide corriente sin cortar el cable.",
    price: 28990,
    stock: 20,
    categoria: "Instrumentos de Medición",
    categorySlug: "instrumentos-medicion",
    aliases: ["pinza de medicion", "tester de corriente", "amperimetro"],
    tags: ["pinza", "amperimetrica", "600a", "corriente"],
  },
  {
    sku: "LAMP-HQI-250",
    title: "Lámpara HQI 250W E40",
    description: "Lámpara HQI 250W base E40, luz blanca de alta eficiencia.",
    price: 18990,
    stock: 24,
    categoria: "Tubos y Lámparas Especiales",
    categorySlug: "tubos-lamparas-especiales",
    aliases: ["lampara metal halide", "hqi 250", "luz invernadero"],
    tags: ["hqi", "250w", "e40", "metal halide"],
  },
];
