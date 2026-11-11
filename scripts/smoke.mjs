#!/usr/bin/env node
// Smoke test: request every route, signed out and signed in, then fail on any server error
// logged while serving them. Catches request-time render errors that build and lint miss
// (e.g. Cache Components prerender errors, which are logged by the dev server, not returned
// in the response).
//
// Reuses the running dev server (Next allows one per project) at SMOKE_URL
// (default http://localhost:3300); otherwise starts `next dev` on that port and stops it after.
// Server errors are read from .next/dev/logs/next-development.log, which every dev server writes.
import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createTestSession, SESSION_COOKIE } from "./dev-session.mjs";

const base = process.env.SMOKE_URL ?? "http://localhost:3300";
const LOG = ".next/dev/logs/next-development.log";

const checks = [
  { path: "/", signedIn: false, expect: (r) => r.status === 200 && r.body.includes("Sign up") },
  { path: "/dashboard", signedIn: false, expect: (r) => r.body.includes("NEXT_REDIRECT") },
  { path: "/dashboard", signedIn: true, expect: (r) => r.status === 200 && r.body.includes("All applications") },
  { path: "/api/auth/providers", signedIn: false, expect: (r) => r.status === 200 && r.body.includes('"google"') },
];

async function reachable(url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    return false;
  }
}

async function startServer() {
  const port = new URL(base).port || "3300";
  const child = spawn("npx", ["next", "dev", "-p", port], { stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  for (let i = 0; i < 120; i++) {
    if (await reachable(base)) return child;
    await new Promise((r) => setTimeout(r, 500));
  }
  child.kill();
  throw new Error(`next dev did not start on ${base}\n${output}`);
}

/** Server-side errors appended to the dev log since `offset`. */
function newLogErrors(offset) {
  if (!existsSync(LOG)) return [];
  return readFileSync(LOG, "utf8")
    .slice(offset)
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((entry) => entry?.source === "Server" && entry.level === "ERROR");
}

const server = (await reachable(base)) ? null : await startServer();
const logOffset = existsSync(LOG) ? statSync(LOG).size : 0;
const cookie = `${SESSION_COOKIE}=${await createTestSession()}`;
let failed = 0;

for (const check of checks) {
  const label = `${check.path} (${check.signedIn ? "signed in" : "signed out"})`;
  const res = await fetch(base + check.path, {
    headers: check.signedIn ? { cookie } : {},
    redirect: "manual",
  });
  const result = { status: res.status, body: await res.text() };
  if (check.expect(result)) {
    console.log(`✓ ${label}`);
  } else {
    console.error(`✗ ${label}: unexpected response (status ${result.status})`);
    failed++;
  }
}

// The dev server validates prerendering after responding; give the log a moment to flush.
await new Promise((r) => setTimeout(r, 1500));
for (const entry of newLogErrors(logOffset)) {
  console.error(`✗ server error: ${entry.message.split("\n")[0]}`);
  failed++;
}

server?.kill();

if (failed) {
  console.error(`\n${failed} smoke check(s) failed. Full log: ${LOG}`);
  process.exit(1);
}
console.log("\nAll smoke checks passed");
