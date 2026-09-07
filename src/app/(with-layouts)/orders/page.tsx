import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Badge } from "@/components/tailgrids/core/badge";
import { prisma } from "@/lib/adapters/prisma";

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

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const where = status ? { status: status as never } : {};
  const orders = await prisma.order.findMany({
    where: where as never,
    take: 50,
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true, email: true } }, store: { select: { name: true, provider: true } }, items: { include: { product: { select: { sku: true, title: true } } } } },
  }).catch(() => []);

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Pedidos", href: "/orders" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-black dark:text-white">Pedidos</h2>
          <p className="text-sm text-text-tertiary">Híbrido: {orders.length} pedidos · Filtra por estado · Fuente Prisma (mismo para mock/Shopify).</p>
        </div>
        <div className="flex gap-2">
          <a href="/orders" className={`rounded-lg px-3 py-1.5 text-sm ${!status ? "bg-brand-500 text-white" : "border border-card-border"}`}>Todos</a>
          {["PENDING", "PAID", "FULFILLED", "CANCELLED"].map((s) => (
            <a key={s} href={`/orders?status=${s}`} className={`rounded-lg px-3 py-1.5 text-sm ${status === s ? "bg-brand-500 text-white" : "border border-card-border"}`}>{s}</a>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Pedidos recientes</CardTitle></CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-text-tertiary">Sin pedidos aún. Crea uno vía <code>POST /api/orders</code> o desde el checkout del agente.</p>
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
                      <td className="p-2 text-center"><Badge color={STATUS_COLOR[o.status] ?? "gray"}>{o.status}</Badge></td>
                      <td className="p-2 text-center"><Badge color={o.paymentStatus === "PAID" ? "success" : "gray"}>{o.paymentStatus}</Badge></td>
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
          <CardHeader><CardTitle>Pedido detalle (más reciente)</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><span className="font-medium">ID:</span> {orders[0].id}</p>
            <p><span className="font-medium">Items:</span> {orders[0].items.map((it) => `${it.product.title} x${it.quantity}`).join(", ") || "—"}</p>
            <p className="text-xs text-text-tertiary">Logs de workflow se ven en <code>/workflows</code> → <code>OrderStepLog</code> (tiempo real XYFlow).</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
