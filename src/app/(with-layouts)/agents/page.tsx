import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { Button } from "@/components/tailgrids/core/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Badge } from "@/components/tailgrids/core/badge";
import { prisma } from "@/lib/adapters/prisma";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agents = await prisma.agent.findMany({ orderBy: { createdAt: "desc" }, take: 20 }).catch(() => []);
  const tools = [
    { name: "searchProducts", desc: "Busca productos (híbrido mock/Shopify)" },
    { name: "checkStock", desc: "Consulta el stock por SKU" },
    { name: "calculatePricing", desc: "Precio + despacho por región" },
    { name: "navigateTo", desc: "Navega a /busqueda o /producto" },
    { name: "checkout", desc: "Crea un pedido híbrido" },
    { name: "processPurchase", desc: "Flujo de trabajo RESERVE→PAY→FULFILL" },
    { name: "scrapeWebsite", desc: "Rastreo Jina para comparar precios y políticas" },
    { name: "sendEmail", desc: "Correo transaccional (carro abandonado/devolución)" },
    { name: "orderTracking", desc: "WISMO: estado del pedido" },
  ];

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Agentes", href: "/agents" }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-black dark:text-white">Agentes — StarShop 1→2→6+3→4</h2>
          <p className="text-sm text-text-tertiary">Híbrido: {agents.length} agentes (Bienvenida + 8 equipos). Cada equipo ve solo sus herramientas. Puedes editarlos en <code>prisma/starshop-prompts.ts</code> + <code>/api/agents</code>.</p>
        </div>
        <Button appearance="fill" className="w-full shrink-0 whitespace-nowrap sm:w-auto">Crear agente</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Herramientas registradas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tools.map((t) => (
              <div key={t.name} className="flex items-center justify-between rounded-lg border border-card-border p-3">
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-text-tertiary">{t.desc}</p>
                </div>
                <Badge color="gray">zod</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Agentes ({agents.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {agents.length === 0 ? (
              <p className="text-sm text-text-tertiary">Todavía no hay agentes. Ejecuta el seed o crea uno. Demo: slug de agente `sales-assistant`.</p>
            ) : (
              agents.map((a) => (
                <div key={a.id} className="rounded-lg border border-card-border p-3">
                  <p className="font-medium">{a.name} <span className="text-xs text-text-tertiary">/{a.slug}</span> <span className="text-xs text-text-tertiary">{a.storeId ? "· híbrido" : ""}</span></p>
                  <p className="text-xs text-text-tertiary line-clamp-2">{a.description ?? a.model} · {(a.systemPrompt ?? "").slice(0, 120)}...</p>
                  <div className="mt-1 flex gap-1"><Badge color={a.isActive ? "success" : "gray"}>{a.isActive ? "Activo" : "Inactivo"}</Badge><Badge color="gray">{a.model}</Badge></div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cómo crear un agente</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-text-secondary space-y-2">
          <p>1. Inserta en <code>prisma.agent</code> con <code>systemPrompt</code> y <code>config.tools</code>.</p>
          <p>2. Usa <code>agent/tools/*.ts</code> con <code>defineTool</code> + <code>zod</code>.</p>
          <p>3. El agente invoca <code>startWorkflow(processOrderWorkflow)</code> — puente EVE → Flujos de trabajo.</p>
        </CardContent>
      </Card>
    </div>
  );
}
