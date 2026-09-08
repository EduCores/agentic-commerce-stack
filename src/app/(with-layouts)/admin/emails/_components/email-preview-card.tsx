import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Badge } from "@/components/tailgrids/core/badge";
import type { EmailTemplateKind } from "@/lib/eve/email-templates";

type Props = {
  kind: EmailTemplateKind;
  subject: string;
  html: string;
  mocked: boolean;
};

export function EmailPreviewCard({ kind, subject, html, mocked }: Props) {
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
        <div className="rounded-lg border border-card-border bg-white p-2" dangerouslySetInnerHTML={{ __html: html }} />
      </CardContent>
    </Card>
  );
}
