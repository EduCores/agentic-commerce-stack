import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { InfoTip } from "@/components/tailgrids/core/info-tip";
import { EmailsStudio } from "./_components/emails-studio";

export const dynamic = "force-dynamic";

export default function AdminEmailsPage() {
  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-3 sm:p-6">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Correos electrónicos", href: "/admin/emails" }]} />
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-black dark:text-white">Correos electrónicos</h2>
        <InfoTip label="Acerca de correos">
          Plantillas con nombres fáciles, secuencias automáticas de recuperación, carros abandonados e historial.
          Mismo diseño en prueba y producción: sin RESEND_API_KEY se registra como prueba; con la key se envía por Resend.
        </InfoTip>
      </div>
      <EmailsStudio />
    </div>
  );
}
