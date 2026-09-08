import { ClockCircleIcon, DisplayIcon, LockIcon, ShieldCheckIcon } from "./icons";

export const securityItems = [
  {
    icon: LockIcon,
    title: "Contraseña actual",
    description: "Cambia la contraseña de tu cuenta para mantener tu perfil seguro",
    actionLabel: "Cambiar",
  },
  {
    icon: ShieldCheckIcon,
    title: "Autenticación en dos pasos",
    description: "Activa la verificación en dos pasos para mayor protección",
    actionLabel: "Activar",
  },
  {
    icon: DisplayIcon,
    title: "Sesión activa",
    description: "Ve y gestiona tus sesiones activas",
    actionLabel: "3 activas",
  },
  {
    icon: ClockCircleIcon,
    title: "Actividad de inicio de sesión",
    description: "Revisa tu actividad reciente y tu historial de accesos",
    actionLabel: "Ver historial",
  },
] as const;
