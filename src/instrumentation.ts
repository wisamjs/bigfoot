import { assertEnv, mustCheckEnv } from "@/lib/env";

/**
 * Runs once when a Next.js server starts. A production server (`next start`, a Vercel Production
 * Function) refuses to start with a gap in its environment. `next dev` skips the check: .env.local
 * supplies the values there, and smoke and a11y run without Google credentials. Vercel Preview
 * deployments skip it too: they have no secrets of their own.
 */
export function register() {
  if (mustCheckEnv(process.env)) assertEnv(process.env);
}
