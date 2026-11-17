import { assertEnv } from "@/lib/env";

/**
 * Runs once when a Next.js server starts. A production server (`next start`, a Vercel Function)
 * refuses to start with a gap in its environment. `next dev` skips the check: .env.local
 * supplies the values there, and smoke and a11y run without Google credentials.
 */
export function register() {
  if (process.env.NODE_ENV === "production") assertEnv(process.env);
}
