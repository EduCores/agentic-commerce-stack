import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { SignUpForm } from "./_components/sign-up-form";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-gray-secondary_alt_2 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <a href="/auth/sign-in" className="text-xs font-medium text-brand-600 underline">← Volver a Iniciar sesión</a>
          <CardTitle className="text-xl">Crear cuenta</CardTitle>
          <p className="text-sm text-text-tertiary">Crea tu acceso al Admin ACS. El primero queda como owner.</p>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
      </Card>
    </div>
  );
}
