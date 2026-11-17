// The environment variables the Next.js app needs, checked once at startup so a deployment
// with a gap fails at once and names every problem, instead of one per request and redeploy.
// The API keeps its own list in api/app/settings.py. Both must match .env.example (env.test.ts).
// No "server-only" here: next.config.ts imports this file outside the bundler.

/** Variables the Next.js app can't run without. */
export const REQUIRED_ENV = ["AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "API_SECRET", "API_URL"] as const;

/** Variables the Next.js app checks but doesn't need. */
export const OPTIONAL_ENV = ["API_DOCS"] as const;

type Env = Record<string, string | undefined>;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

function isLocalhost(url: string) {
  try {
    const { hostname } = new URL(url);
    return LOCAL_HOSTS.has(hostname) || hostname.endsWith(".localhost");
  } catch {
    return false;
  }
}

/** Vercel's Production environment. Previews and a local `next start` may use a local API and its docs. */
function inProduction(env: Env) {
  return env.VERCEL_ENV === "production";
}

/** Everything wrong with the environment; empty when it is fine. */
export function envProblems(env: Env): string[] {
  const problems = [];
  const missing = REQUIRED_ENV.filter((name) => !env[name]?.trim());
  if (missing.length) problems.push(`Missing: ${missing.join(", ")} (see .env.example)`);
  if (inProduction(env)) {
    if (env.API_URL && isLocalhost(env.API_URL)) {
      problems.push(`API_URL must not be a localhost address in production (it is ${env.API_URL})`);
    }
    if (env.API_DOCS?.trim().toLowerCase() === "true") {
      problems.push("API_DOCS must not be true in production");
    }
  }
  return problems;
}

/** Throws one error naming every problem with the environment. */
export function assertEnv(env: Env): void {
  const problems = envProblems(env);
  if (problems.length) {
    throw new Error(`Invalid environment variables:\n${problems.map((problem) => `- ${problem}`).join("\n")}`);
  }
}
