import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";

export default function BreadcrumbArrow() {
  return (
    <div className="flex flex-col gap-5">
      <Breadcrumbs
        dividerType="chevron"
        items={[
          { href: "#", label: "Documentos" },
          { href: "#", label: "Ajustes" },
        ]}
      />

      <Breadcrumbs
        dividerType="chevron"
        items={[
          { href: "#", label: "Panel" },
          { href: "#", label: "Perfil" },
          { href: "#", label: "Mensajes" },
        ]}
      />

      <Breadcrumbs
        dividerType="chevron"
        items={[
          { href: "#", label: "Panel" },
          { href: "#", label: "Cuenta" },
          { href: "#", label: "Informes" },
          { href: "#", label: "Analíticas" },
          { href: "#", label: "Soporte" },
        ]}
      />

      <Breadcrumbs
        dividerType="chevron"
        items={[
          { href: "#", label: "Panel" },
          { href: "#", label: "..." },
          { href: "#", label: "Usuarios" },
          { href: "#", label: "Facturación" },
          { href: "#", label: "Cerrar sesión" },
        ]}
      />
    </div>
  );
}
