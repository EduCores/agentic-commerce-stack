import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { buildTemplate, EMAIL_TEMPLATE_KINDS } from "@/lib/eve/email-templates";
import { EmailPreviewCard } from "./_components/email-preview-card";
import { EmailTestPanel } from "./_components/email-test-panel";

export const dynamic = "force-dynamic";

export default function AdminEmailsPage() {
  const mocked = !process.env.RESEND_API_KEY;
  const previews = EMAIL_TEMPLATE_KINDS.map((kind) => ({
    kind,
    ...buildTemplate(kind, { orderId: "DEMO-1001", to: "dueño@starshop.cl" }),
  }));

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Emails", href: "/admin/emails" }]} />
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white">Emails — templates mock/prod</h2>
        <p className="text-sm text-text-tertiary">
          Mismo HTML en mock y prod. Sin RESEND_API_KEY se loguea; con key se envía por Resend.
        </p>
      </div>
      <EmailTestPanel />
      <div className="grid gap-4 md:grid-cols-2">
        {previews.map((p) => (
          <EmailPreviewCard key={p.kind} kind={p.kind} subject={p.subject} html={p.html} mocked={mocked} />
        ))}
      </div>
    </div>
  );
}
