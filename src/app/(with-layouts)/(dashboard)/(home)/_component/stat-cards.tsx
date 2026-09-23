"use client";

import { Package, ShoppingCart, Users, Workflow } from "lucide-react";
import { formatCLP, type HomeStats } from "./home-types";
import { HomeCardLink } from "./home-card-link";

type Props = {
  stats: HomeStats;
};

const CARDS = [
  {
    key: "productos",
    title: "Productos",
    icon: Package,
    accent: "from-sky-400 to-blue-500",
    chip: "bg-badge-sky-background text-badge-sky-text",
    getValue: (s: HomeStats) => s.counts.products.toLocaleString("es-CL"),
    getDetail: (s: HomeStats) => `Stock ${s.stock.total} · ${s.stock.availability}% disponible`,
    href: "/products",
    link: "Ver catálogo",
  },
  {
    key: "pedidos",
    title: "Pedidos",
    icon: ShoppingCart,
    accent: "from-violet-400 to-purple-500",
    chip: "bg-badge-violet-background text-badge-violet-text",
    getValue: (s: HomeStats) => s.counts.orders.toLocaleString("es-CL"),
    getDetail: (s: HomeStats) => `Ingresos ${formatCLP(s.revenue)}`,
    href: "/orders",
    link: "Ver pedidos",
  },
  {
    key: "clientes",
    title: "Clientes",
    icon: Users,
    accent: "from-emerald-400 to-teal-500",
    chip: "bg-badge-success-background text-badge-success-text",
    getValue: (s: HomeStats) => s.counts.customers.toLocaleString("es-CL"),
    getDetail: (s: HomeStats) => `${s.counts.agents} agentes · ${s.counts.agentRuns} ejecuciones`,
    href: "/crm",
    link: "Ver CRM",
  },
  {
    key: "flujos",
    title: "Flujos de trabajo",
    icon: Workflow,
    accent: "from-amber-400 to-orange-500",
    chip: "bg-badge-warning-background text-badge-warning-text",
    getValue: (s: HomeStats) => s.counts.workflows.toLocaleString("es-CL"),
    getDetail: (s: HomeStats) => `${s.counts.workflowRuns} ejecuciones`,
    href: "/workflows",
    link: "Ver flujos",
  },
];

export function StatCards({ stats }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {CARDS.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.key} className="flex flex-col justify-between rounded-xl border border-card-border bg-card-background p-5 transition hover:shadow-sm">
            <div className={`h-1.5 rounded-full bg-gradient-to-r ${c.accent}`} />
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-secondary">{c.title}</p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary">{c.getValue(stats)}</p>
                <p className="mt-1 text-xs leading-4 text-text-tertiary">{c.getDetail(stats)}</p>
              </div>
              <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${c.chip} [&>svg]:size-6`}>
                <Icon />
              </span>
            </div>
            <HomeCardLink href={c.href}>{c.link} →</HomeCardLink>
          </div>
        );
      })}
    </div>
  );
}
