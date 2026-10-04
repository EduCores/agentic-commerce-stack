"use client";

import { useEffect } from "react";

/**
 * Error boundary global (App Router): captura errores de render del cliente
 * y los reporta al mini-Sentry. Fire-and-forget: el reporte nunca bloquea
 * la pantalla de recuperación.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/errors/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message || String(error), stack: error.stack }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="es">
      <body>
        <div style={{ maxWidth: 560, margin: "10vh auto", padding: 24, fontFamily: "system-ui" }}>
          <h2>Algo salió mal</h2>
          <p>Registramos el error automáticamente. Intenta de nuevo.</p>
          <button
            onClick={() => reset()}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer" }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
