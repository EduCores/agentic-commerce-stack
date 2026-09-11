import ThemeToggle from "@/components/common/header/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { SignInForm } from "./_components/sign-in-form";
import { SignInTheme } from "./_components/sign-in-theme";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-gray-secondary_alt_2 p-4">
      <SignInTheme />
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Link href="/login" className="text-xs font-medium text-brand-600 underline">← Volver</Link>
            <ThemeToggle />
          </div>
          <CardTitle className="text-xl">Iniciar sesión</CardTitle>
          <p className="text-sm text-text-tertiary">¡Qué bueno verte de nuevo! Inicia sesión para entrar a tu cuenta.</p>
        </CardHeader>
        <CardContent>
          <SignInForm />
          <p className="mt-4 text-center text-[11px] text-text-tertiary">StarShop ACS · Panel del dueño</p>
        </CardContent>
      </Card>
    </div>
  );
}
