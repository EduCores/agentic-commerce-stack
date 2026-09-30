import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";
import { prisma } from "@/lib/adapters/prisma";
import { resolveProductImage } from "@/utils/product-image";
import type { Prisma } from "../../src/generated/prisma/client";

/**
 * Utilidades de fecha en hora chilena + resumen reutilizable por ventana.
 *
 * TODOS los cortes de día son America/Santiago. Antes se usaba
 * setHours(0,0,0,0) del servidor (UTC) y el "día" quedaba corrido 3-4 h:
 * un pedido de las 23:30 CLT contaba como "ayer".
 */

/** Zona horaria oficial de la tienda. */
const TIENDA_TZ = "America/Santiago";

/** Offset (hora local − UTC) en minutos para un instante dado. */
function offsetMinutos(tz: string, at: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  const hora = p.hour === "24" ? "00" : p.hour;
  const comoUTC = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(hora),
    Number(p.minute),
    Number(p.second),
  );
  return (comoUTC - at.getTime()) / 60000;
}

/** Clave AAAA-MM-DD de un instante, vista en la zona. */
function claveLocal(tz: string, at: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Instante UTC de las 00:00 locales de `clave` (2 pasadas bastan ante un cambio de horario). */
function medianocheEnTz(tz: string, clave: string): Date {
  const [y, m, d] = clave.split("-").map(Number);
  let intento = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  for (let i = 0; i < 2; i++) {
    intento = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - offsetMinutos(tz, intento) * 60000);
  }
  return intento;
}

type TopProducto = {
  title: string;
  sku: string;
  quantity: number;
  revenue: number;
  price: number;
  image: string;
};

/** Ingresos + pedidos + top 3 de una ventana [inicio, fin). Solo PAID/FULFILLED. */
async function resumenVentana(
  inicio: Date,
  fin: Date,
  storeId?: string,
  onError?: (e?: unknown) => void,
): Promise<{ revenue: number; orders: number; topProducts: TopProducto[] }> {
  const filtro: Prisma.OrderWhereInput = {
    status: { in: ["PAID", "FULFILLED"] },
    createdAt: { gte: inicio, lt: fin },
    // Sin storeId el resumen mezcla TODAS las tiendas: el dueño vería ingresos
    // ajenos. El router-admin informa la tienda actual y el prompt exige pasarla.
    ...(storeId ? { storeId } : {}),
  };
  // Cada lectura con fallback avisa vía onError: un cero por BD caída no debe
  // confundirse con "sin ventas" (ver dbOk en execute).
  const fail = (e: unknown) => {
    console.warn("[sales-summary] lectura BD falló, se usa fallback", e instanceof Error ? e.message : e);
    onError?.();
  };
  const [rev, n, grupos] = await Promise.all([
    prisma.order.aggregate({ _sum: { total: true }, where: filtro }).catch((e) => {
      fail(e);
      return { _sum: { total: null } };
    }),
    prisma.order.count({ where: filtro }).catch((e) => {
      fail(e);
      return 0;
    }),
    prisma.orderItem
      .groupBy({
        by: ["productId"],
        _sum: { quantity: true, total: true },
        where: { order: filtro },
        orderBy: { _sum: { quantity: "desc" } },
        take: 3,
      })
      .catch((e) => {
        fail(e);
        return [];
      }),
  ]);

  const ids = grupos.map((g) => g.productId);
  const metas = ids.length
    ? await prisma.product
        .findMany({ where: { id: { in: ids } }, select: { id: true, title: true, sku: true, price: true, images: true } })
        .catch((e) => {
          fail(e);
          return [];
        })
    : [];
  const topProducts: TopProducto[] = grupos.map((g) => {
    const m = metas.find((x) => x.id === g.productId);
    const imgs = Array.isArray(m?.images) ? m.images : [];
    return {
      title: m?.title ?? "Producto",
      sku: m?.sku ?? g.productId.slice(0, 8),
      quantity: g._sum.quantity ?? 0,
      revenue: Math.round(Number(g._sum.total ?? 0)),
      price: m?.price != null ? Math.round(Number(m.price)) : 0,
      image: resolveProductImage(imgs),
    };
  });

  return { revenue: Math.round(Number(rev._sum.total ?? 0)), orders: n, topProducts };
}

/**
 * Resumen REAL de ventas para el dueño (admin_ops): día pedido + contexto automático.
 * Lee Prisma directo: ingresos y pedidos pagados/completados, top 3 por unidades
 * con sus ingresos, stock total/reservado, MÁS el día anterior completo (previous,
 * con su top 3) y los últimos 7 días (last7: totales, promedio y serie día a día).
 * Nunca inventa cifras: si no hay movimientos, devuelve ceros y listas vacías.
 */
export default defineTool({
  description:
    "Resumen real de ventas del dueño (ingresos CLP, pedidos pagados/completados, top 3, stock) en hora de CHILE. Por defecto HOY; period=yesterday para ayer; date=AAAA-MM-DD para un día exacto. SIEMPRE devuelve además el contexto de comparación: `previous` (el día anterior completo, con su top 3) y `last7` (ingresos, pedidos, promedio diario y serie día por día de los últimos 7 días). Úsala SIEMPRE antes de responder preguntas del dueño sobre ventas/ingresos/cómo van las ventas. Si el período pedido viene en 0, responde con la comparación (previous + last7) en el MISMO mensaje, sin preguntar. SOLO para admin_ops.",
  inputSchema: z.object({
    period: z.enum(["today", "yesterday"]).optional().default("today"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "date debe ser AAAA-MM-DD")
      .optional(),
    storeId: z.string().optional().describe("ID de la tienda (el router-admin lo informa en el contexto). Sin storeId el resumen mezcla todas las tiendas."),
  }),
  async execute({ period, date, storeId }) {
    // Corte del día en HORA CHILENA (nunca la del servidor/UTC).
    const ahora = new Date();
    let clave = claveLocal(TIENDA_TZ, ahora);
    if (date) {
      clave = date; // se asume AAAA-MM-DD de la hora chilena
    } else if ((period ?? "today") === "yesterday") {
      const ayer = new Date(ahora.getTime() - 24 * 3600 * 1000);
      clave = claveLocal(TIENDA_TZ, ayer);
    }
    const inicio = medianocheEnTz(TIENDA_TZ, clave);
    const fin = new Date(inicio.getTime() + 24 * 3600 * 1000);
    const inicioPrevio = new Date(inicio.getTime() - 24 * 3600 * 1000);

    const label = date ?? ((period ?? "today") === "yesterday" ? "ayer" : "hoy");
    const sid = storeId?.trim() || undefined;
    // Si la BD falla, las lecturas devuelven ceros por los .catch: se marca dbOk
    // para que el dueño distinga "sin ventas" de "no pude leer los datos".
    // (Antes un corte de BD se reportaba como revenue:0/orders:0 indistinguible.)
    let dbOk = true;
    const fail = (e: unknown) => {
      dbOk = false;
      console.warn("[sales-summary] lectura BD falló, se usa fallback", e instanceof Error ? e.message : e);
    };

    // Día pedido + día anterior completo + últimos 7 días (para comparar sin una 2ª llamada).
    const [dia, previo, stockAgg, sieteDias] = await Promise.all([
      resumenVentana(inicio, fin, sid, fail),
      (async () => {
        const r = await resumenVentana(inicioPrevio, inicio, sid, fail);
        return {
          date: claveLocal(TIENDA_TZ, inicioPrevio),
          label: "ayer",
          ...r,
        };
      })(),
      prisma.product
        .aggregate({ _sum: { stock: true, reservedStock: true }, ...(sid ? { where: { storeId: sid } } : {}) })
        .catch((e) => {
          fail(e);
          return { _sum: { stock: 0, reservedStock: 0 } };
        }),
      prisma.order
        .findMany({
          where: {
            status: { in: ["PAID", "FULFILLED"] },
            createdAt: { gte: new Date(inicio.getTime() - 6 * 24 * 3600 * 1000), lt: fin },
            ...(sid ? { storeId: sid } : {}),
          },
          select: { total: true, createdAt: true },
        })
        .catch((e) => {
          fail(e);
          return [] as { total: unknown; createdAt: Date }[];
        }),
    ]);

    // Serie día a día de los últimos 7 días: cada bucket usa las medianoches REALES
    // del día en hora chilena (asi borda bien si hubo un cambio de horario entremedio).
    const serie: { date: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const c = claveLocal(TIENDA_TZ, new Date(inicio.getTime() - i * 24 * 3600 * 1000));
      const b0 = medianocheEnTz(TIENDA_TZ, c);
      const b1 = new Date(b0.getTime() + 24 * 3600 * 1000);
      const del = sieteDias.filter((o) => o.createdAt.getTime() >= b0.getTime() && o.createdAt.getTime() < b1.getTime());
      serie.push({
        date: c,
        revenue: Math.round(del.reduce((a, o) => a + Number(o.total ?? 0), 0)),
        orders: del.length,
      });
    }
    const rev7 = serie.reduce((a, d) => a + d.revenue, 0);
    const ped7 = serie.reduce((a, d) => a + d.orders, 0);

    return {
      date: clave,
      label,
      storeId: sid ?? null,
      // dbOk=false = alguna lectura falló: los ceros son fallback, NO ventas reales.
      // El prompt admin_ops ordena reportarlo como corte de datos, jamás como "sin ventas".
      dbOk,
      revenue: dia.revenue,
      orders: dia.orders,
      topProducts: dia.topProducts,
      totalStock: stockAgg._sum.stock ?? 0,
      reservedStock: stockAgg._sum.reservedStock ?? 0,
      previous: previo,
      last7: {
        revenue: rev7,
        orders: ped7,
        dailyAverage: Math.round(rev7 / 7),
        days: serie,
      },
    };
  },
});
