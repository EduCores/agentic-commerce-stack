import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { InfoTip } from "@/components/tailgrids/core/info-tip";
import { StarShopChat } from "@/components/chat/starshop-chat";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <div className="space-y-6 p-3 sm:p-6 max-w-3xl mx-auto">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Chat IA", href: "/chat" }]} />
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-black dark:text-white">Chat Star — Agente IA con tipeo</h2>
        <InfoTip label="Acerca de este chat">
          Streaming SSE real + escritura progresiva de respaldo. Usa el mismo router 1→2→6+3→4.
        </InfoTip>
      </div>
      <StarShopChat />
      <p className="text-xs text-text-tertiary text-center">Prueba: “quiero ver taladros” → “compara el precio con Sodimac” → “dónde está mi pedido”</p>
    </div>
  );
}
