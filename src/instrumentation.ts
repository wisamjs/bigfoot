import * as Sentry from "@sentry/nextjs";
import { assertEnv, mustCheckEnv } from "@/lib/env";
import { sentryOptions } from "@/lib/sentry";

/**
 * Runs once when a Next.js server starts. A production server (`next start`, a Vercel Production
 * Function) refuses to start with a gap in its environment. `next dev` skips the check: .env.local
 * supplies the values there, and smoke and a11y run without Google credentials. Vercel Preview
 * deployments skip it too: they have no secrets of their own.
 *
 * Then it starts Sentry for this runtime (Node.js or edge). The server also answers the browser
 * SDK's tunnel requests, so ad blockers don't drop error reports.
 */
export function register() {
  if (mustCheckEnv(process.env)) assertEnv(process.env);
  Sentry.init({ ...sentryOptions(), integrations: [Sentry.serveTunnelIntegration()] });
}

/** Errors from Server Components, route handlers, Server Actions and the proxy. */
export const onRequestError = Sentry.captureRequestError;
