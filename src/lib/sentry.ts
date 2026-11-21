// Sentry options shared by the browser, Node.js and edge SDKs (BIG-14). Error reports must not
// carry job seekers' Applications or identity to Sentry: the SDK collects no user data, cookies,
// headers, query strings or bodies, and `scrub` removes emails and tokens from what is left.
// The job seeker is named only by a hash of their job seeker id (see `jobSeekerTag`).
import type { ErrorEvent } from "@sentry/nextjs";

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Three base64url segments, as in a JWT (Auth.js and API tokens).
const JWT = /\beyJ[\w-]*\.[\w-]+\.[\w-]+/g;

/** A string with emails and JWTs replaced. */
export function scrubText(text: string): string {
  return text.replace(EMAIL, "[email]").replace(JWT, "[token]");
}

function scrubValue(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return scrubText(value);
  if (depth > 8 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, scrubValue(item, depth + 1)]));
}

/** `beforeSend`: drops cookies, headers and bodies, and scrubs emails and JWTs from every string. */
export function scrub<T extends ErrorEvent>(event: T): T {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
    delete event.request.query_string;
  }
  if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
  return scrubValue(event) as T;
}

/** The Vercel environment (`production`, `preview`), or `development` off Vercel. */
export function sentryEnvironment(env: Record<string, string | undefined>): string {
  return env.NEXT_PUBLIC_VERCEL_ENV || env.VERCEL_ENV || "development";
}

/** Traces to keep: all of them locally, so a test shows one; a tenth elsewhere, to stay in the free tier. */
export function tracesSampleRate(environment: string): number {
  return environment === "development" ? 1 : 0.1;
}

/** Options every Bigfoot Sentry SDK starts with. Without a DSN the SDK sends nothing. */
export function sentryOptions() {
  // Inlined at build time by Next.js, so the browser bundle has them too.
  const environment = sentryEnvironment({
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });
  return {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment,
    tracesSampleRate: tracesSampleRate(environment),
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    beforeSend: scrub,
  };
}

/** The job seeker as Sentry sees them: a SHA-256 of their job seeker id, never the id itself. */
export async function jobSeekerTag(jobSeekerId: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(jobSeekerId));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
