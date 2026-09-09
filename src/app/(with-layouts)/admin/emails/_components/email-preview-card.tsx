"use client";

import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Badge } from "@/components/tailgrids/core/badge";
import { EMAIL_DARK_SCOPED_CSS, type EmailTemplateKind } from "@/lib/eve/email-templates";

type Props = {
  kind: EmailTemplateKind;
  subject: string;
  html: string;
  mocked: boolean;
};

export function EmailPreviewCard({ kind, subject, html, mocked }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  // El <style> del HTML sigue al SO; se retira para que el preview siga al tema de la app.
  const cleanHtml = html.replace(/<style[\s\S]*?<\/style>/gi, "");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{kind}</span>
          <Badge color={mocked ? "gray" : "success"}>{mocked ? "prueba" : "resend"}</Badge>
        </CardTitle>
        <p className="text-xs text-text-tertiary">{subject}</p>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-card-border bg-white dark:bg-zinc-900 p-2">
          <div
            className={isDark ? "email-dark" : undefined}
            style={{ colorScheme: isDark ? "dark" : "light" }}
            dangerouslySetInnerHTML={{ __html: cleanHtml }}
          />
          {isDark && <style>{EMAIL_DARK_SCOPED_CSS}</style>}
        </div>
      </CardContent>
    </Card>
  );
}
