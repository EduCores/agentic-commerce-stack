import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { SignInForm } from "../auth/sign-in/_components/sign-in-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-gray-secondary_alt_2 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto mb-2 text-2xl font-black">STAR<span className="text-[#fdd817]">SHOP</span> ACS</div>
          <CardTitle className="text-xl">Iniciar sesión</CardTitle>
          <p className="text-sm text-text-tertiary">¡Qué bueno verte de nuevo! Inicia sesión para entrar a tu cuenta.</p>
        </CardHeader>
        <CardContent>
          <SignInForm />
          <p className="mt-4 text-center text-[11px] text-text-tertiary">NextAdmin · Hecho para desarrolladores, pensado para ser eficiente</p>
        </CardContent>
      </Card>
    </div>
  );
}
