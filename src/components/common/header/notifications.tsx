"use client";

import {
  BellIcon,
  CreditCardIcon,
  LetterIcon,
  PrinterIcon,
  SettingIcon,
} from "@/components/common/header/icons";
import { Button } from "@/components/tailgrids/core/button";
import { OverlayWrapper } from "@/components/tailgrids/core/overlay";
import { Popover } from "@/components/tailgrids/core/popover";
import { ScrollArea, ScrollAreaViewport, ScrollBar } from "@/components/tailgrids/core/scroll-area";
import { cn } from "@/utils/cn";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Header, Heading } from "react-aria-components";

interface Notification {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  timestamp: string;
  isUnread?: boolean;
  href?: string;
}

type AlertOrder = {
  id: string;
  total: unknown;
  status: string;
  createdAt: string;
  customer: { name: string | null } | null;
};

const defaultNotifications: { title: string; items: Notification[] }[] = [
  {
    title: "Hoy",
    items: [
      {
        id: "1",
        icon: <LetterIcon />,
        title: "Nuevo mensaje recibido",
        description: "Javiera Paredes te envió un mensaje nuevo",
        timestamp: "hace 5 h",
        isUnread: true,
      },
      {
        id: "2",
        icon: <CreditCardIcon />,
        title: "Transacción aprobada",
        description: "Tu pago de $89.990 a Matías Soto fue exitoso.",
        timestamp: "hace 10 h",
        isUnread: true,
      },
      {
        id: "3",
        icon: <PrinterIcon />,
        title: "Cuenta próxima a vencer",
        description: "Recordatorio: la factura N° 1234 vence en 3 días. Por favor realiza el pago.",
        timestamp: "hace 12 h",
        isUnread: false,
      },
    ],
  },
  {
    title: "Ayer",
    items: [
      {
        id: "4",
        icon: <CreditCardIcon />,
        title: "Transacción aprobada",
        description: "Tu pago de $129.990 a Nicolás Vargas fue exitoso.",
        timestamp: "ayer",
        isUnread: true,
      },
      {
        id: "5",
        icon: <LetterIcon />,
        title: "Nuevo mensaje recibido",
        description: "Camila Rojas te envió un mensaje nuevo",
        timestamp: "ayer",
        isUnread: true,
      },
      {
        id: "6",
        icon: <PrinterIcon />,
        title: "Cuenta próxima a vencer",
        description: "Recordatorio: la factura N° 1235 vence mañana. Por favor realiza el pago.",
        timestamp: "ayer",
        isUnread: false,
      },
    ],
  },
];

export function NotificationsButton() {
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [readAlerts, setReadAlerts] = useState<string[]>([]);
  const router = useRouter();

  const { data: alerts } = useQuery({
    queryKey: ["order-alerts"],
    queryFn: async () => {
      const [failed, pending] = await Promise.all([
        fetch("/api/orders?status=FAILED&take=5").then((r) => r.json()),
        fetch("/api/orders?status=PENDING&take=5").then((r) => r.json()),
      ]);
      return {
        items: [...(failed.items as AlertOrder[]), ...(pending.items as AlertOrder[])].slice(0, 6),
      };
    },
    staleTime: 60000,
  });

  const alertItems: Notification[] = (alerts?.items ?? []).map((o) => ({
    id: `alert-${o.id}`,
    icon: <CreditCardIcon />,
    title: `Pedido ${o.id.slice(0, 8)} ${o.status === "FAILED" ? "fallido" : "pendiente"}`,
    description: `${o.customer?.name ?? "Sin cliente"} · $${Number(o.total).toLocaleString("es-CL")}`,
    timestamp: new Date(o.createdAt).toLocaleString("es-CL"),
    href: `/orders?status=${o.status}`,
    isUnread: !readAlerts.includes(`alert-${o.id}`),
  }));

  const groups =
    alertItems.length > 0
      ? [{ title: "Pedidos con alerta", items: alertItems }, ...notifications]
      : notifications;

  const unreadCount = groups.flatMap((n) => n.items).filter((n) => n.isUnread).length;

  const handleMarkAsRead = (notificationId: string, href?: string) => {
    if (notificationId.startsWith("alert-")) {
      setReadAlerts((prev) => (prev.includes(notificationId) ? prev : [...prev, notificationId]));
    } else {
      setNotifications((prevNotifications) =>
        prevNotifications.map((group) => ({
          ...group,
          items: group.items.map((item) =>
            item.id === notificationId ? { ...item, isUnread: false } : item,
          ),
        })),
      );
    }
    if (href) {
      setIsOpen(false);
      router.push(href);
    }
  };

  const handleMarkAllAsRead = () => {
    setNotifications(
      notifications.map((n) => ({ ...n, items: n.items.map((i) => ({ ...i, isUnread: false })) })),
    );
  };

  return (
    <OverlayWrapper isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button
        iconOnly
        appearance="outline"
        className="relative size-10 rounded-lg border border-card-border bg-card-background text-icon-primary shadow-xs focus-visible:border-input-primary-focus-border focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20 [&>svg]:size-auto"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className={cn("absolute top-2 right-2.75 z-1 size-2 rounded-full bg-red-400")}>
            <span className="absolute inset-0 -z-1 animate-ping rounded-full bg-red-400 opacity-75" />
          </span>
        )}
      </Button>

      <Popover
        placement="bottom end"
        className="w-84.5 overflow-hidden rounded-2xl border border-border-secondary-alt bg-background-white-secondary p-0 shadow-3xl"
      >
        {/* Header */}
        <Header className="flex items-center justify-between border-b border-border-secondary-alt px-5 pt-5 pb-4">
          <Heading level={4} className="leading-6 font-semibold text-text-primary">
            Notificaciones
          </Heading>

          <Link
            className="p-1 text-icon-secondary transition-colors hover:text-icon-primary"
            href="/profile/notification"
            onClick={() => setIsOpen(false)}
          >
            <SettingIcon />
          </Link>
        </Header>

        <ScrollArea className="h-100 max-h-100">
          <ScrollAreaViewport>
              {groups.map((group) => (
              <section key={group.title}>
                {/* Group Header */}
                <div className="border-t border-b border-border-primary bg-background-gray-secondary px-5 py-2">
                  <p className="text-xs leading-4 text-text-tertiary uppercase">{group.title}</p>
                </div>
                {/* Notifications List */}
                <ul className="flex-1 overflow-y-auto px-3 py-2">
                  {group.items.map((notification) => (
                    <li key={notification.id}>
                      <button
                        className="group flex w-full cursor-pointer gap-3.5 rounded-lg px-3 py-3 transition-colors duration-300 hover:bg-background-gray-secondary_alt"
                        onClick={() => handleMarkAsRead(notification.id, notification.href)}
                      >
                        {/* Icon */}
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-secondary bg-background-gray-primary text-icon-secondary transition-all duration-300 group-hover:bg-brand-500 group-hover:text-button-primary-text group-hover:shadow-[0_1px_3px_0.5px_rgba(13,13,18,0.08)]">
                          {notification.icon}
                        </span>

                        {/* Content */}
                        <div className="min-w-0 flex-1 text-start">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm leading-5 font-semibold text-text-primary">
                              {notification.title}
                            </p>

                            {notification.isUnread && (
                              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                            )}
                          </div>

                          <p className="mt-1 line-clamp-2 text-xs leading-4 text-text-secondary">
                            {notification.description}
                          </p>
                          <p className="mt-2 text-xs leading-4 text-text-tertiary">
                            {notification.timestamp}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </ScrollAreaViewport>
          <ScrollBar />
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-secondary-alt px-5 py-4">
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs font-medium text-text-secondary underline transition-colors hover:text-text-primary"
          >
            Marcar todas como leídas
          </button>
          <Button variant="primary" size="sm" className="bg-brand-500 py-1.5">
            Ver todas
          </Button>
        </div>
      </Popover>
    </OverlayWrapper>
  );
}
