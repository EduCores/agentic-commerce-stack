import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { Button } from "@/components/tailgrids/core/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Badge } from "@/components/tailgrids/core/badge";
import { prisma } from "@/lib/adapters/prisma";
import Link from "next/link";
import { Bot, Wrench, Sparkles, Search, PackageCheck, Calculator, Navigation, ShoppingCart, CreditCard, Globe, Mail, Truck } from "lucide-react";
import { AgentsHero } from "./_components/agents-hero";
import { AgentsRequestsChart } from "./_components/requests-chart";
import { AgentsModelsChart } from "./_components/models-chart";

export const dynamic = "force-dynamic";

const TOOL_META: Record<string, { icon: typeof Search; color: string }> = {
  searchProducts: { icon: Search, color: "bg-badge-sky-background text-badge-sky-text" },
  checkStock: { icon: PackageCheck, color: "bg-badge-success-background text-badge-success-text" },
  calculatePricing: { icon: Calculator, color: "bg-badge-warning-background text-badge-warning-text" },
  navigateTo: { icon: Navigation, color: "bg-badge-violet-background text-badge-violet-text" },
  checkout: { icon: ShoppingCart, color: "bg-badge-primary-background text-badge-primary-text" },
  processPurchase: { icon: CreditCard, color: "bg-badge-primary-background text-badge-primary-text" },
  scrapeWebsite: { icon: Globe, color: "bg-badge-sky-background text-badge-sky-text" },
  sendEmail: { icon: Mail, color: "bg-badge-warning-background text-badge-warning-text" },
  orderTracking: { icon: Truck, color: "bg-badge-success-background text-badge-success-text" },
};

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
          <h2 className="text-xl font-bold tracking-tight text-black dark:text-white">Agentes — equipo StarShop</h2>
          <p className="text-sm text-text-tertiary">
            {agents.length} agentes orquestados · Bienvenida → 8 equipos especializados · cada uno ve solo sus herramientas · edítalos en{" "}
            <code className="rounded bg-background-gray-secondary px-1 py-0.5">prisma/starshop-prompts.ts</code>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/workflows" className="rounded-lg border border-card-border bg-card-background px-4 py-2 text-sm font-medium hover:bg-background-gray-secondary">
            Ver flujos
          </Link>
          <Button appearance="fill" className="shrink-0 whitespace-nowrap">Crear agente</Button>
        </div>
      </div>

      <AgentsHero fallbackCount={agents.length} />

      <div className="grid gap-4 md:grid-cols-2">
        <AgentsRequestsChart />
        <AgentsModelsChart />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-badge-sky-background text-badge-sky-text [&>svg]:size-4">
                <Wrench />
              </span>
              <CardTitle>Herramientas registradas — caja de herramientas del agente</CardTitle>
            </div>
            <p className="mt-1 text-xs text-text-tertiary">{tools.length} tools validadas con zod · cada agente ve solo las suyas</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="h-1.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-500" />
            {tools.map((t) => {
              const meta = TOOL_META[t.name] ?? { icon: Wrench, color: "bg-badge-gray-background text-badge-gray-text" };
              const Icon = meta.icon;
              return (
                <div key={t.name} className="flex items-center gap-3 rounded-lg border border-card-border p-3 transition hover:border-brand-500/40 hover:bg-background-gray-secondary/30">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${meta.color} [&>svg]:size-4`}>
                    <Icon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">{t.name}</p>
                    <p className="truncate text-xs text-text-tertiary">{t.desc}</p>
                  </div>
                  <Badge color="gray">zod</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-badge-violet-background text-badge-violet-text [&>svg]:size-4">
                <Bot />
              </span>
              <CardTitle>Agentes ({agents.length}) — quién hace qué</CardTitle>
            </div>
            <p className="mt-1 text-xs text-text-tertiary">Bienvenida + 8 equipos · verde activo, gris pausado · modelo y prompt visibles</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="h-1.5 rounded-full bg-gradient-to-r from-violet-400 to-indigo-500" />
            {agents.length === 0 ? (
              <p className="mt-3 text-sm text-text-tertiary">Todavía no hay agentes. Ejecuta el seed o crea uno. Demo: slug <code>sales-assistant</code>.</p>
            ) : (
              agents.map((a, i) => (
                <div key={a.id} className="rounded-lg border border-card-border p-3 transition hover:border-violet-400/40 hover:bg-background-gray-secondary/20">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 font-semibold text-text-primary">
                        {a.name}
                        <span className="font-mono text-xs font-normal text-text-tertiary">/{a.slug}</span>
                        {a.storeId && <Badge color="sky">híbrido</Badge>}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-4 text-text-tertiary">
                        {a.description ?? "Sin descripción"} · <span className="font-mono">{(a.systemPrompt ?? "").slice(0, 110)}...</span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Badge color={a.isActive ? "success" : "gray"}>{a.isActive ? "Activo" : "Inactivo"}</Badge>
                        <Badge color="gray">{a.model}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/30 [&>svg]:size-4">
              <Sparkles />
            </span>
            <CardTitle>Cómo crear un agente — en 3 pasos</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="h-1.5 rounded-full bg-gradient-to-r from-teal-400 to-[#328e8f]" />
          <ol className="grid gap-3 sm:grid-cols-3">
            <li className="rounded-lg border border-card-border bg-background-gray-secondary/30 p-3">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-black">1</span>
              <p className="mt-2 font-semibold text-text-primary">Define el agente</p>
              <p className="text-xs leading-4 text-text-tertiary">
                Inserta en <code className="rounded bg-card-background px-1 py-0.5">prisma.agent</code> con <code>systemPrompt</code> y <code>config.tools</code> (ej: <code>sales-assistant</code>).
              </p>
            </li>
            <li className="rounded-lg border border-card-border bg-background-gray-secondary/30 p-3">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-black">2</span>
              <p className="mt-2 font-semibold text-text-primary">Crea la herramienta</p>
              <p className="text-xs leading-4 text-text-tertiary">
                En <code className="rounded bg-card-background px-1 py-0.5">agent/tools/*.ts</code> usa <code>defineTool</code> + <code>zod</code>. Se valida y aparece arriba.
              </p>
            </li>
            <li className="rounded-lg border border-card-border bg-background-gray-secondary/30 p-3">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-black">3</span>
              <p className="mt-2 font-semibold text-text-primary">Conecta el flujo</p>
              <p className="text-xs leading-4 text-text-tertiary">
                El agente invoca <code className="rounded bg-card-background px-1 py-0.5">startWorkflow(processOrderWorkflow)</code> — puente EVE → Flujos.
              </p>
            </li>
          </ol>
          <p className="rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">
            Tip: edita prompts y modelos sin código en <Link href="/workflows" className="font-bold underline">/workflows</Link> y publica — el agente los usa en ~60s.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
