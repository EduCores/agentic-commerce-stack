import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { SignInForm } from "./_components/sign-in-form";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-gray-secondary_alt_2 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <a href="/login" className="text-xs font-medium text-brand-600 underline">← Volver</a>
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
