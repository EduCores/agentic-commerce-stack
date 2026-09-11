import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { prisma } from "@/lib/adapters/prisma";
import Link from "next/link";
import { STATUS_COLOR, STATUS_LABEL } from "../page";

export const dynamic = "force-dynamic";

const STEP_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  RUNNING: "En curso",
  COMPLETED: "Completado",
  FAILED: "Fallido",
  SKIPPED: "Omitido",
  RETRYING: "Reintentando",
};

const STEP_COLOR: Record<string, "success" | "warning" | "error" | "gray"> = {
  COMPLETED: "success",
  FAILED: "error",
  RUNNING: "warning",
  RETRYING: "warning",
  PENDING: "gray",
  SKIPPED: "gray",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, email: true } },
      store: { select: { name: true, provider: true } },
      items: { include: { product: { select: { sku: true, title: true } } } },
      stepLogs: { orderBy: { createdAt: "desc" } },
    },
  }).catch(() => null);

  if (!order) {
    return (
      <div className="space-y-6 p-3 sm:p-6">
        <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Pedidos", href: "/orders" }, { label: "Detalle", href: `/orders/${id}` }]} />
        <Card>
          <CardContent className="p-6 text-sm text-text-tertiary">
            Pedido no encontrado. <Link href="/orders" className="font-medium text-brand-600 underline">Volver a Pedidos</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Pedidos", href: "/orders" }, { label: order.id.slice(0, 8), href: `/orders/${order.id}` }]} />
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white">Pedido {order.id.slice(0, 8)}</h2>
        <p className="text-sm text-text-tertiary">{new Date(order.createdAt).toLocaleString("es-CL")} · {order.store.name} ({order.store.provider})</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Resumen</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-medium">Cliente:</span> {order.customer?.name ?? "—"} <span className="text-xs text-text-tertiary">{order.customer?.email ?? ""}</span></p>
            <p><span className="font-medium">Total:</span> ${Number(order.total).toLocaleString("es-CL")} {order.currency}</p>
            <div className="flex flex-wrap gap-2">
              <Badge color={STATUS_COLOR[order.status] ?? "gray"}>{STATUS_LABEL[order.status] ?? order.status}</Badge>
              <Badge color={order.paymentStatus === "PAID" ? "success" : "gray"}>Pago: {STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0 md:col-span-2">
          <CardHeader><CardTitle className="text-sm">Productos ({order.items.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="border-b border-card-border text-xs text-text-tertiary">
                  <tr><th className="p-2 text-left">Producto</th><th className="p-2 text-left">SKU</th><th className="p-2 text-right">Cant.</th><th className="p-2 text-right">Precio</th></tr>
                </thead>
                <tbody>
                  {order.items.map((it) => (
                    <tr key={it.id} className="border-b border-card-border/60">
                      <td className="p-2">{it.product.title}</td>
                      <td className="p-2 font-mono text-xs">{it.product.sku}</td>
                      <td className="p-2 text-right">{it.quantity}</td>
                      <td className="p-2 text-right">${Number(it.price).toLocaleString("es-CL")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Línea de tiempo del flujo</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {order.stepLogs.length === 0 ? (
            <p className="text-sm text-text-tertiary">Sin pasos registrados — el flujo aún no corre o el pedido es manual.</p>
          ) : order.stepLogs.map((s) => (
            <div key={s.id} className="flex flex-col gap-1 rounded-lg border border-card-border p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{s.stepName} <span className="text-xs text-text-tertiary">· intento {s.attempt}</span></p>
                {s.error && <p className="truncate text-xs text-red-600">{s.error}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge color={STEP_COLOR[s.status] ?? "gray"}>{STEP_LABEL[s.status] ?? s.status}</Badge>
                <span className="text-xs text-text-tertiary">{new Date(s.createdAt).toLocaleString("es-CL")}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
