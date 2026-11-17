import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { assertEnv } from "./src/lib/env";

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

export default function config(phase: string): NextConfig {
  // A Vercel build fails here, before deploying, when the environment has a gap. Builds
  // elsewhere (CI, a laptop) don't need the secrets; src/instrumentation.ts checks at startup.
  if (phase === PHASE_PRODUCTION_BUILD && process.env.VERCEL) assertEnv(process.env);
  return nextConfig;
}
