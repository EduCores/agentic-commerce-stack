"use client";

import { useState } from "react";
import { StarShopChat } from "./starshop-chat";

/**
 * StarShop Widget — burbuja flotante IA para la TIENDA
 * Se renderiza en el layout global: parece agente real (escribe + dots + streaming)
 * y es el widget que puedes embeber en Shopify/Woo con <script src="/widget.js">
 */
export function StarShopWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Botón burbuja */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Cerrar chat" : "Abrir chat Star"}
        className="fixed bottom-5 right-5 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-xl shadow-brand-500/30 transition hover:scale-105 hover:bg-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-500/30"
      >
        {open ? (
          <span className="text-xl">×</span>
        ) : (
          <span className="text-xl">💬</span>
        )}
        {!open && (
          <>
            <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-emerald-500 ring-2 ring-white" />
            <span className="absolute bottom-1 right-14 whitespace-nowrap rounded-full bg-black px-2 py-1 text-xs text-white">Star IA — tipeando...</span>
          </>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-[92vw] max-w-[380px] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="overflow-hidden rounded-2xl border border-card-border bg-card-surface-area shadow-2xl">
            <StarShopChat />
          </div>
          <p className="mt-2 text-center text-[10px] text-text-tertiary">StarShop IA — escribe como agente • streaming SSE</p>
        </div>
      )}
    </>
  );
}
