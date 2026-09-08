import { BellIcon, ShieldCheckIcon, UserIcon } from "./icons";

export const tabsItems = [
  {
    href: "/profile/account",
    icon: <UserIcon />,
    title: "Cuenta",
    description: "Gestiona tus datos personales",
  },
  {
    href: "/profile/security",
    icon: <ShieldCheckIcon />,
    title: "Seguridad",
    description: "Configura tu contraseña, autenticación, etc.",
  },
  {
    href: "/profile/notification",
    icon: <BellIcon />,
    title: "Notificaciones",
    description: "Personaliza tus preferencias de avisos",
  },
];
