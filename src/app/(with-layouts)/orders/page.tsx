import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { InfoTip } from "@/components/tailgrids/core/info-tip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Badge } from "@/components/tailgrids/core/badge";
import { prisma } from "@/lib/adapters/prisma";
import Link from "next/link";
import { ReceiptText, TriangleAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "gray"> = {
  PENDING: "warning",
  RESERVED: "warning",
  PAID: "success",
  FULFILLED: "success",
  CANCELLED: "gray",
  FAILED: "error",
  REFUNDED: "gray",
};

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  RESERVED: "Reservado",
  PAID: "Pagado",
  FULFILLED: "Completado",
  CANCELLED: "Cancelado",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
};

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const where = status ? { status: status as never } : {};
  const include = {
    customer: { select: { name: true, email: true } },
    store: { select: { name: true, provider: true } },
    items: { include: { product: { select: { sku: true, title: true } } } },
  } as const;

  const [orders, latestOrder, reviewOrder] = await Promise.all([
    // Lista con el filtro de estado activo.
    prisma.order
      .findMany({ where: where as never, take: 50, orderBy: { createdAt: "desc" }, include })
      .catch(() => []),
    // El pedido más reciente real (sin filtro): el que acaba de entrar.
    prisma.order.findFirst({ orderBy: { createdAt: "desc" }, include }).catch(() => null),
    // El último con alerta (FAILED/PENDING) + motivo del flujo: lo accionable para salvar la venta.
    prisma.order
      .findFirst({
        where: { status: { in: ["FAILED", "PENDING"] } } as never,
        orderBy: { createdAt: "desc" },
        include: { ...include, stepLogs: { where: { status: "FAILED" } as never, orderBy: { createdAt: "desc" }, take: 1 } },
      })
      .catch(() => null),
  ]);

  const alertCount = orders.filter((o) => o.status === "FAILED" || o.status === "PENDING").length;
  const formatItems = (o: { items: { quantity: number; product: { title: string } }[] }) =>
    o.items.map((it) => `${it.product.title} x${it.quantity}`).join(", ");

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Pedidos", href: "/orders" }]} />
      {alertCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/20">
          <p className="text-sm font-bold text-amber-700">⚠️ {alertCount} con alerta — lo derivamos a una persona y salvamos la venta</p>
          <p className="text-xs text-text-tertiary">El bot no perdió la venta: revisa el detalle y contacta a tu cliente. Los registros están en /workflows.</p>
        </div>
      )}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-black dark:text-white">Pedidos</h2>
          <InfoTip label="Acerca de pedidos">
            Híbrido: {orders.length} pedidos · Filtra por estado · Fuente Prisma (igual para mock/Shopify).
          </InfoTip>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          <Link href="/orders" className={`rounded-lg px-3 py-2 text-center text-sm font-medium ${!status ? "bg-brand-500 text-button-primary-text" : "border border-card-border bg-card-background hover:bg-background-gray-secondary"}`}>Todos</Link>
          {["PENDING", "PAID", "FULFILLED", "CANCELLED"].map((s) => (
            <Link key={s} href={`/orders?status=${s}`} className={`rounded-lg px-3 py-2 text-center text-sm font-medium ${status === s ? "bg-brand-500 text-button-primary-text" : "border border-card-border bg-card-background hover:bg-background-gray-secondary"}`}>{STATUS_LABEL[s] ?? s}</Link>
          ))}
        </div>
      </div>


      <Card>
        <CardHeader><CardTitle>Pedidos recientes</CardTitle></CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-text-tertiary">Sin pedidos todavía. Crea uno vía <code>POST /api/orders</code> o desde el checkout del agente.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-text-tertiary border-b border-card-border">
                  <tr><th className="text-left p-2">Pedido</th><th className="text-left p-2">Cliente</th><th className="text-left p-2">Tienda</th><th className="text-right p-2">Total</th><th className="text-center p-2">Estado</th><th className="text-center p-2">Pago</th></tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-card-border/60">
                      <td className="p-2"><p className="font-mono text-xs"><Link href={`/orders/${o.id}`} className="underline hover:text-text-primary">{o.id.slice(0, 8)}</Link></p><p className="text-xs text-text-tertiary">{new Date(o.createdAt).toLocaleDateString("es-CL")}</p></td>
                      <td className="p-2">{o.customer?.name ?? "—"}<p className="text-xs text-text-tertiary">{o.customer?.email ?? ""}</p></td>
                      <td className="p-2">{o.store.name} <Badge color="gray">{o.store.provider}</Badge></td>
                      <td className="p-2 text-right">${Number(o.total).toLocaleString("es-CL")}</td>
                      <td className="p-2 text-center"><Badge color={STATUS_COLOR[o.status] ?? "gray"}>{STATUS_LABEL[o.status] ?? o.status}</Badge></td>
                      <td className="p-2 text-center"><Badge color={o.paymentStatus === "PAID" ? "success" : "gray"}>{STATUS_LABEL[o.paymentStatus] ?? o.paymentStatus}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fila de detalle: el más reciente (sin filtro) y, a su derecha, el accionable con alerta. */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Informativo: el pedido más reciente real, sin importar el filtro activo. */}
        {latestOrder && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-badge-sky-background text-badge-sky-text [&>svg]:size-4">
                  <ReceiptText />
                </span>
                <CardTitle className="text-sm">Último pedido — sin filtro</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link href={`/orders/${latestOrder.id}`} className="font-mono text-xs font-bold text-brand-600 underline">
                  {latestOrder.id.slice(0, 8)}
                </Link>
                <Badge color={STATUS_COLOR[latestOrder.status] ?? "gray"}>{STATUS_LABEL[latestOrder.status] ?? latestOrder.status}</Badge>
                <Badge color={latestOrder.paymentStatus === "PAID" ? "success" : "gray"}>Pago: {STATUS_LABEL[latestOrder.paymentStatus] ?? latestOrder.paymentStatus}</Badge>
                <span className="font-medium text-text-primary">{latestOrder.customer?.name ?? "Sin cliente"}</span>
                <span className="ml-auto text-xl font-extrabold tracking-tight text-text-primary">${Number(latestOrder.total).toLocaleString("es-CL")}</span>
              </div>
              <p className="mt-2 text-xs text-text-tertiary">
                {new Date(latestOrder.createdAt).toLocaleString("es-CL")} · {latestOrder.store.name} ({latestOrder.store.provider})
              </p>
              <p className="mt-2 line-clamp-1 text-text-primary" title={formatItems(latestOrder)}>
                {formatItems(latestOrder) || "Sin productos"}
              </p>
              <p className="mt-2 text-xs text-text-tertiary">
                Traza del flujo (OrderStepLog, intentos y errores) en{" "}
                <Link href={`/orders/${latestOrder.id}`} className="font-medium text-brand-600 underline">
                  el detalle del pedido
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        )}

        {/* Accionable: el último pedido con alerta, con el motivo del flujo y acceso directo. */}
        {reviewOrder && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-badge-warning-background text-badge-warning-text [&>svg]:size-4">
                  <TriangleAlert />
                </span>
                <CardTitle className="text-sm">Pedido a revisar — último con alerta</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Badge color={STATUS_COLOR[reviewOrder.status] ?? "gray"}>{STATUS_LABEL[reviewOrder.status] ?? reviewOrder.status}</Badge>
                <span className="font-medium text-text-primary">{reviewOrder.customer?.name ?? "Sin cliente"}</span>
                {reviewOrder.customer?.email && (
                  <a href={`mailto:${reviewOrder.customer.email}`} className="text-xs text-brand-600 underline">
                    {reviewOrder.customer.email}
                  </a>
                )}
                <span className="ml-auto text-xl font-extrabold tracking-tight text-text-primary">${Number(reviewOrder.total).toLocaleString("es-CL")}</span>
              </div>
              <p className="mt-2 text-xs text-text-tertiary">
                {new Date(reviewOrder.createdAt).toLocaleString("es-CL")} · {reviewOrder.store.name} ({reviewOrder.store.provider}) · ID {reviewOrder.id.slice(0, 8)}
              </p>
              <p className="mt-2 line-clamp-2 text-text-primary" title={formatItems(reviewOrder)}>
                {formatItems(reviewOrder) || "Sin productos"}
              </p>
              {reviewOrder.stepLogs[0]?.error ? (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/20">
                  Motivo del flujo: {reviewOrder.stepLogs[0].error}
                </p>
              ) : (
                <p className="mt-2 text-xs text-text-tertiary">
                  {reviewOrder.status === "FAILED"
                    ? "Sin error registrado en el flujo — revisa la línea de tiempo en el detalle."
                    : "Pendiente de pago o confirmación: contacta al cliente para cerrar la venta."}
                </p>
              )}
              <Link
                href={`/orders/${reviewOrder.id}`}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-bold text-button-primary-text hover:bg-brand-600"
              >
                Ver detalle del pedido →
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
