// Sentry servidor — Fase seguridad/observabilidad.
// Sin SENTRY_DSN es no-op (dev local sin DSN no envía nada).
import * as Sentry from "@sentry/nextjs";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
