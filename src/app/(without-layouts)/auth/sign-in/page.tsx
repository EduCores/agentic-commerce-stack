import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { SignInForm } from "./_components/sign-in-form";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-gray-secondary_alt_2 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <a href="/login" className="text-xs font-medium text-brand-600 underline">← Back</a>
          <CardTitle className="text-xl">Sign In</CardTitle>
          <p className="text-sm text-text-tertiary">Welcome back! Please sign in to access your account.</p>
        </CardHeader>
        <CardContent>
          <SignInForm />
          <p className="mt-4 text-center text-[11px] text-text-tertiary">NextAdmin · Built for Developers, Designed for Efficiency</p>
        </CardContent>
      </Card>
    </div>
  );
}
