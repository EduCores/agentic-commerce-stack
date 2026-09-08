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
    label: "AGENTIC COMMERCE",
    items: [
      {
        title: "Dashboard",
        icon: <HomeIcon />,
        url: "/",
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
        title: "Store",
        icon: <TableIcon />,
        url: "/store",
        items: [],
      },
      {
        title: "Agents",
        icon: <UserIcon />,
        url: "/agents",
        items: [],
      },
      {
        title: "Workflows",
        icon: <Widget4Icon />,
        url: "/workflows",
        items: [],
      },
      {
        title: "Admin",
        icon: <UserIcon />,
        url: "/admin",
        items: [],
      },
      {
        title: "Analytics",
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
      {
        title: "AI",
        icon: <Widget4Icon />,
        url: "/ai",
        items: [],
      },
      {
        title: "Manage Team",
        icon: <TaskIcon />,
        url: "/manage-team",
        items: [],
      },
      {
        title: "Emails",
        icon: <LetterIcon />,
        url: "/admin/emails",
        items: [],
      },
    ],
  },
];
