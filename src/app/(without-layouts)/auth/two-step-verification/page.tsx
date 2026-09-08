import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { TwoStepForm } from "./_components/two-step-form";

export default function TwoStepPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-gray-secondary_alt_2 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <a href="/auth/sign-in" className="text-xs font-medium text-brand-600 underline">← Back</a>
          <CardTitle className="text-xl">Two Step Verification</CardTitle>
          <p className="text-sm text-text-tertiary">Te enviamos un código de 6 dígitos válido por 5 minutos.</p>
        </CardHeader>
        <CardContent>
          <TwoStepForm />
        </CardContent>
      </Card>
    </div>
  );
}
