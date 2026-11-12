import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SUBPROCESSORS } from "./subprocessors";

// Providers whose SDK means job seekers' data reaches them. When one of these packages is
// installed, the provider must be in SUBPROCESSORS, and the Privacy Policy must say what it
// receives; when none is installed, it must not be listed. Add a row before adding a new SDK.
const SDKS: Record<string, { npm: string[]; python: string[] }> = {
  Sentry: { npm: ["@sentry/nextjs", "@sentry/node", "@sentry/react"], python: ["sentry-sdk"] },
  PostHog: { npm: ["posthog-js", "posthog-node"], python: ["posthog"] },
  "Vercel Analytics": { npm: ["@vercel/analytics", "@vercel/speed-insights"], python: [] },
};

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const npmDeps = new Set(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }));
const pyproject = readFileSync("api/pyproject.toml", "utf8");
const pythonDeps = new Set([...pyproject.matchAll(/^\s*"([A-Za-z0-9_.-]+)/gm)].map((m) => m[1].toLowerCase()));

describe("SUBPROCESSORS", () => {
  it.each(Object.entries(SDKS))("lists %s exactly when its SDK is installed", (name, sdk) => {
    const installed = sdk.npm.some((p) => npmDeps.has(p)) || sdk.python.some((p) => pythonDeps.has(p));
    expect(SUBPROCESSORS.some((s) => s.name === name)).toBe(installed);
  });

  it("reads the API's dependencies", () => {
    expect(pythonDeps).toContain("fastapi");
  });
});
