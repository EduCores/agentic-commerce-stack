// Registra Sentry en el runtime Node (requerido por Next.js).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
}
