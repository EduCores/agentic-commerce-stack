import { DisplayIcon, LockIcon, ShieldCheckIcon } from "./icons";

export type SecurityItemKey = "password" | "2fa" | "session";

export const securityItems: { key: SecurityItemKey; icon: typeof LockIcon; title: string; description: string }[] = [
  {
    key: "password",
    icon: LockIcon,
    title: "Contraseña",
    description: "Cambia la contraseña de tu cuenta para mantener tu perfil seguro",
  },
  {
    key: "2fa",
    icon: ShieldCheckIcon,
    title: "Autenticación en dos pasos",
    description: "Exige un código de tu correo al iniciar sesión",
  },
  {
    key: "session",
    icon: DisplayIcon,
    title: "Sesión actual",
    description: "Ve con qué cuenta y dispositivo estás conectado",
  },
];
