import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { assertEnv, inProduction } from "./src/lib/env";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Google profile photos
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

function config(phase: string): NextConfig {
  // A Vercel Production build fails here, before deploying, when the environment has a gap.
  // Preview builds and builds elsewhere (CI, a laptop) don't have the secrets;
  // src/instrumentation.ts checks a production server at startup.
  if (phase === PHASE_PRODUCTION_BUILD && inProduction(process.env)) assertEnv(process.env);
  return nextConfig;
}

// Uploads source maps to Sentry when SENTRY_AUTH_TOKEN is set (Vercel builds), then deletes them
// so they are never served. A failed upload fails the build. The release is the git SHA
// (VERCEL_GIT_COMMIT_SHA), which the plugin reads on Vercel.
export default withSentryConfig(config, {
  org: "bigfoot-30",
  project: "bigfoot-frontend",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  telemetry: false,
});
