import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { AdminChat } from "@/components/chat/admin-chat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";

export const dynamic = "force-dynamic";

export default function AdminAgentPage() {
  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }]} />
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white">Admin Ops — StarShop Dueño</h2>
        <p className="text-sm text-text-tertiary">Mismo estilo StarShop (amarillo #FFD814, tipeo 35ms, voz Edge) pero para operar la tienda.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Prueba admin — mismo funcionamiento que StarShop</CardTitle></CardHeader>
        <CardContent className="text-xs text-text-tertiary space-y-1">
          <p>• <code>¿cuánto vendí hoy?</code> → ingresos + top productos + links /orders</p>
          <p>• <code>stock bajo</code> → lista &lt;10 con SKU/stock</p>
          <p>• <code>pedidos con alerta</code> → FAILED/PENDING (se salvó la venta)</p>
          <p>• <code>crea producto SKU TEST</code> → guía POST /api/products</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">WhatsApp separados</CardTitle></CardHeader>
        <CardContent className="text-xs text-text-tertiary space-y-1">
          <p>• Tienda (clientes): <code>{process.env.NEXT_PUBLIC_WHATSAPP_STORE ?? "56993301557"}</code> — widget público StarShop.</p>
          <p>• Equipo general: <code>{process.env.NEXT_PUBLIC_WHATSAPP_TEAM || "sin configurar"}</code> — botón flotante de este admin.</p>
          <p>• Miembros: los teléfonos de <a href="/manage-team" className="underline">Gestionar el equipo</a> aparecen solos en el botón — agregar activa, borrar o eliminar saca de WhatsApp.</p>
          {!process.env.NEXT_PUBLIC_WHATSAPP_TEAM && (
            <p>Configura <code>NEXT_PUBLIC_WHATSAPP_TEAM</code> en <code>.env</code> y Vercel para el número general del equipo.</p>
          )}
        </CardContent>
      </Card>
      <AdminChat />
    </div>
  );
}
