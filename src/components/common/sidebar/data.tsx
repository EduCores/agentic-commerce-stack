import type { ReactNode } from "react";
import {
  ChatIcon,
  HomeIcon,
  LetterIcon,
  PieChartIcon,
  TableIcon,
  TaskIcon,
  UserGroupIcon,
  UserIcon,
  Widget4Icon,
  WindowIcon,
} from "./icon";

export type NavChild = { title: string; url: string };
export type NavItem = { title: string; icon?: ReactNode; url?: string; items: NavChild[] };
export type NavSection = { label: string; items: NavItem[] };

export const NAV_DATA: NavSection[] = [
  {
    label: "PANEL",
    items: [
      {
        title: "Almacenar",
        icon: <HomeIcon />,
        url: "/store",
        items: [],
      },
      {
        title: "Productos",
        icon: <TableIcon />,
        url: "/products",
        items: [],
      },
      {
        title: "Pedidos",
        icon: <WindowIcon />,
        url: "/orders",
        items: [],
      },
      {
        title: "Slider principal",
        icon: <Widget4Icon />,
        url: "/slider",
        items: [],
      },
      {
        title: "Correos",
        icon: <LetterIcon />,
        url: "/admin/emails",
        items: [],
      },
    ],
  },
  {
    label: "AI",
    items: [
      {
        title: "Resumen AI",
        icon: <Widget4Icon />,
        url: "/ai",
        items: [],
      },
      {
        title: "Agentes",
        icon: <UserIcon />,
        url: "/agents",
        items: [],
      },
      {
        title: "Flujos de trabajo",
        icon: <Widget4Icon />,
        url: "/workflows",
        items: [],
      },
    ],
  },
  {
    label: "GESTIÓN",
    items: [
      {
        title: "Gestionar el equipo",
        icon: <TaskIcon />,
        url: "/manage-team",
        items: [],
      },
      {
        title: "Analítica",
        icon: <PieChartIcon />,
        url: "/analytics",
        items: [],
      },
      {
        title: "Marketing",
        icon: <ChatIcon />,
        url: "/marketing",
        items: [],
      },
      {
        title: "CRM",
        icon: <UserGroupIcon />,
        url: "/crm",
        items: [],
      },
    ],
  },
];
