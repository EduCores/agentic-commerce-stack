import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { StarShopChat } from "@/components/chat/starshop-chat";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <div className="space-y-6 p-3 sm:p-6 max-w-3xl mx-auto">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Chat IA", href: "/chat" }]} />
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white">Chat Star — Agente IA con tipeo</h2>
        <p className="text-sm text-text-tertiary">Streaming SSE real + escritura progresiva de respaldo. Usa el mismo router 1→2→6+3→4.</p>
      </div>
      <StarShopChat />
      <p className="text-xs text-text-tertiary text-center">Prueba: “quiero ver taladros” → “compara el precio con Sodimac” → “dónde está mi pedido”</p>
    </div>
  );
}
