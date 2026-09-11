import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ResetForm } from "./_components/reset-form";
import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-gray-secondary_alt_2 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link href="/auth/sign-in" className="text-xs font-medium text-brand-600 underline">← Volver</Link>
          <CardTitle className="text-xl">Restablecer contraseña</CardTitle>
          <p className="text-sm text-text-tertiary">Te enviamos un token de 15 minutos a tu correo.</p>
        </CardHeader>
        <CardContent>
          <ResetForm />
        </CardContent>
      </Card>
    </div>
  );
}
