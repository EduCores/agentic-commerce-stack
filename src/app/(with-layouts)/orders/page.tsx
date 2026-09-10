import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Badge } from "@/components/tailgrids/core/badge";
import { prisma } from "@/lib/adapters/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "gray"> = {
  PENDING: "warning",
  RESERVED: "warning",
  PAID: "success",
  FULFILLED: "success",
  CANCELLED: "gray",
  FAILED: "error",
  REFUNDED: "gray",
};

const STATUS_LABEL: Record<string, string> = {
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
  const orders = await prisma.order.findMany({
    where: where as never,
    take: 50,
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true, email: true } }, store: { select: { name: true, provider: true } }, items: { include: { product: { select: { sku: true, title: true } } } } },
  }).catch(() => []);

  const alertCount = orders.filter((o) => o.status === "FAILED" || o.status === "PENDING").length;

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Pedidos", href: "/orders" }]} />
      {alertCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/20">
          <p className="text-sm font-bold text-amber-700">⚠️ {alertCount} con alerta — lo derivamos a una persona y salvamos la venta</p>
          <p className="text-xs text-text-tertiary">El bot no perdió la venta: revisa el detalle y contacta a tu cliente. Los registros están en /workflows.</p>
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-black dark:text-white">Pedidos</h2>
          <p className="text-sm text-text-tertiary">Híbrido: {orders.length} pedidos · Filtra por estado · Fuente Prisma (igual para mock/Shopify).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/orders" className={`rounded-lg px-3 py-1.5 text-sm ${!status ? "bg-brand-500 text-white" : "border border-card-border"}`}>Todos</Link>
          {["PENDING", "PAID", "FULFILLED", "CANCELLED"].map((s) => (
            <Link key={s} href={`/orders?status=${s}`} className={`rounded-lg px-3 py-1.5 text-sm ${status === s ? "bg-brand-500 text-white" : "border border-card-border"}`}>{STATUS_LABEL[s] ?? s}</Link>
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
                      <td className="p-2"><p className="font-mono text-xs">{o.id.slice(0, 8)}</p><p className="text-xs text-text-tertiary">{new Date(o.createdAt).toLocaleDateString("es-CL")}</p></td>
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

      {orders[0] && (
        <Card>
          <CardHeader><CardTitle>Detalle del pedido (más reciente)</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><span className="font-medium">ID:</span> {orders[0].id}</p>
            <p><span className="font-medium">Productos:</span> {orders[0].items.map((it) => `${it.product.title} x${it.quantity}`).join(", ") || "—"}</p>
            <p className="text-xs text-text-tertiary">Los registros del flujo de trabajo se ven en <code>/workflows</code> → <code>OrderStepLog</code> (tiempo real XYFlow).</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
