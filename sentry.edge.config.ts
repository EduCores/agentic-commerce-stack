// Sentry edge (middleware) — Fase seguridad/observabilidad.
// Sin SENTRY_DSN es no-op.
import * as Sentry from "@sentry/nextjs";

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}
