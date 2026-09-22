"use client";

import Link from "next/link";
import { Bolt1, BoxArchive1, Cart2, UserMultiple1 } from "@tailgrids/icons";
import { formatCLP, type HomeStats } from "./home-types";

type Accent = {
  bar: string;
  chip: string;
};

const ACCENTS: Record<string, Accent> = {
  sky: { bar: "from-sky-400 to-blue-500", chip: "bg-badge-sky-background text-badge-sky-text" },
  violet: { bar: "from-violet-400 to-purple-500", chip: "bg-badge-violet-background text-badge-violet-text" },
  success: { bar: "from-emerald-400 to-green-500", chip: "bg-badge-success-background text-badge-success-text" },
  warning: { bar: "from-amber-400 to-orange-500", chip: "bg-badge-warning-background text-badge-warning-text" },
};

type Props = {
  stats: HomeStats;
};

export function StatCards({ stats }: Props) {
  const cards = [
    {
      accent: ACCENTS.sky,
      icon: <BoxArchive1 />,
      title: "Productos",
      value: stats.counts.products.toLocaleString("es-CL"),
      detail: `Stock total ${stats.stock.total} · Disponibilidad ${stats.stock.availability}%`,
      href: "/products",
      link: "Ver productos",
    },
    {
      accent: ACCENTS.violet,
      icon: <Cart2 />,
      title: "Pedidos",
      value: stats.counts.orders.toLocaleString("es-CL"),
      detail: `Ingresos ${formatCLP(stats.revenue)}`,
      href: "/orders",
      link: "Ver pedidos",
    },
    {
      accent: ACCENTS.success,
      icon: <UserMultiple1 />,
      title: "Clientes",
      value: stats.counts.customers.toLocaleString("es-CL"),
      detail: `Agentes ${stats.counts.agents} · Ejecuciones ${stats.counts.agentRuns}`,
      href: "/crm",
      link: "Ver clientes",
    },
    {
      accent: ACCENTS.warning,
      icon: <Bolt1 />,
      title: "Flujos de trabajo",
      value: stats.counts.workflows.toLocaleString("es-CL"),
      detail: `Ejecuciones ${stats.counts.workflowRuns}`,
      href: "/workflows",
      link: "Ver flujos",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((c) => (
        <div key={c.title} className="rounded-xl border border-card-border bg-card-background p-5">
          <div className={`h-1.5 rounded-full bg-gradient-to-r ${c.accent.bar}`} />
          <div className="mt-3 flex items-center gap-2.5">
            <span className={`flex size-9 items-center justify-center rounded-lg ${c.accent.chip} [&>svg]:size-4.5`}>
              {c.icon}
            </span>
            <p className="text-sm font-medium text-text-secondary">{c.title}</p>
          </div>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-text-primary">{c.value}</p>
          <p className="mt-1 text-xs text-text-tertiary">{c.detail}</p>
          <Link href={c.href} className="mt-2 inline-block text-xs font-medium text-brand-600 underline">
            {c.link} →
          </Link>
        </div>
      ))}
    </div>
  );
}
