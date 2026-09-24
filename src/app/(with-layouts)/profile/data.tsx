import { CreditCard } from "lucide-react";
import { BellIcon, ShieldCheckIcon, UserIcon } from "./icons";

export const tabsItems = [
  {
    href: "/profile/account",
    icon: <UserIcon />,
    title: "Cuenta",
    description: "Gestiona tus datos personales",
    color: "bg-badge-sky-background text-badge-sky-text",
  },
  {
    href: "/profile/security",
    icon: <ShieldCheckIcon />,
    title: "Seguridad",
    description: "Configura tu contraseña, autenticación, etc.",
    color: "bg-badge-violet-background text-badge-violet-text",
  },
  {
    href: "/profile/notification",
    icon: <BellIcon />,
    title: "Notificaciones",
    description: "Personaliza tus preferencias de avisos",
    color: "bg-badge-warning-background text-badge-warning-text",
  },
  {
    href: "/profile/billing",
    icon: <CreditCard className="size-5" />,
    title: "Facturación",
    description: "Plan, método de pago e historial",
    color: "bg-badge-success-background text-badge-success-text",
  },
];
