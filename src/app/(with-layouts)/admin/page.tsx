import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { StarShopChat } from "@/components/chat/starshop-chat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";

export const dynamic = "force-dynamic";

export default function AdminAgentPage() {
  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }]} />
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white">Admin Ops — StarShop Dueño</h2>
        <p className="text-sm text-text-tertiary">Mismo estilo StarShop (amarillo, tipeo, voz) pero para operar: métricas, stock bajo, pedidos con alerta, crear producto.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Prueba admin</CardTitle></CardHeader>
        <CardContent className="text-xs text-text-tertiary space-y-1">
          <p>• <code>¿cuánto vendí hoy?</code> → ingresos + top productos</p>
          <p>• <code>stock bajo</code> → lista &lt;10</p>
          <p>• <code>pedidos con alerta</code> → FAILED/PENDING</p>
          <p>• <code>crea producto SKU TEST</code> → guía POST /api/products</p>
        </CardContent>
      </Card>
      <StarShopChat />
    </div>
  );
}
