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
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Correos electrónicos", href: "/admin/emails" }]} />
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white">Correos electrónicos — plantillas de prueba y producción</h2>
        <p className="text-sm text-text-tertiary">
          Mismo HTML en prueba y producción. Sin RESEND_API_KEY se registra en el log; con la key se envía por Resend.
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
