#!/usr/bin/env node
// Smoke test: request every route, signed out and signed in, then fail on any server error
// logged while serving them. Catches request-time render errors that build and lint miss
// (e.g. Cache Components prerender errors, which are logged by the dev server, not returned
// in the response).
//
// Reuses the running dev server (Next allows one per project) at SMOKE_URL
// (default http://localhost:3300); otherwise starts `next dev` on that port and stops it after.
// Likewise reuses the API at API_URL (default http://localhost:8000), or starts it against the
// `bigfoot_test` schema (created by `npm run test:api`) and stops it after.
// Server errors are read from .next/dev/logs/next-development.log, which every dev server writes.
import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createTestSession, SESSION_COOKIE } from "./dev-session.mjs";

const base = process.env.SMOKE_URL ?? "http://localhost:3300";
const apiBase = process.env.API_URL ?? "http://localhost:8000";
const LOG = ".next/dev/logs/next-development.log";
// Generous enough for a first compile in `next dev`; short enough that a hung request fails fast.
const REQUEST_TIMEOUT_MS = 20_000;

const checks = [
  { path: "/", signedIn: false, expect: (r) => r.status === 200 && r.body.includes("Sign up") },
  { path: "/dashboard", signedIn: false, expect: (r) => r.body.includes("NEXT_REDIRECT") },
  { path: "/dashboard", signedIn: true, expect: (r) => r.status === 200 && r.body.includes("All applications") },
  { path: "/api/auth/providers", signedIn: false, expect: (r) => r.status === 200 && r.body.includes('"google"') },
  // The API rejects requests without a token from the Next.js server.
  { url: () => `${apiBase}/applications`, signedIn: false, expect: (r) => r.status === 401 },
];

async function reachable(url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    return false;
  }
}

const started = [];

/**
 * Stops a server and everything it spawned. `npx` and `uv run` launch the real server
 * (next-server, uvicorn) as a child that can outlive them, so kill the whole process group.
 */
function stop(child) {
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {}
}

// Runs on every exit, including when a server fails to start, so no server outlives smoke.
process.on("exit", () => started.forEach(stop));

async function start(url, command, args, options = {}) {
  // detached: the server leads its own process group, which stop() kills as one.
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], detached: true, ...options });
  started.push(child);
  let output = "";
  let exited = false;
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  child.on("exit", () => (exited = true));
  for (let i = 0; i < 120; i++) {
    if (await reachable(url)) return child;
    // e.g. `next dev` quits at once when another dev server for this project runs on another port.
    if (exited) throw new Error(`${command} ${args.join(" ")} exited before serving ${url}\n${output}`);
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${command} ${args.join(" ")} did not start on ${url}\n${output}`);
}

function startServer() {
  return start(base, "npx", ["next", "dev", "-p", new URL(base).port || "3300"]);
}

function startApi() {
  const port = new URL(apiBase).port || "8000";
  return start(`${apiBase}/health`, "uv", ["run", "uvicorn", "--factory", "app.main:create_app", "--port", port], {
    cwd: "api",
    env: { ...process.env, DB_SCHEMA: process.env.DB_SCHEMA ?? "bigfoot_test" },
  });
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

if (!(await reachable(`${apiBase}/health`))) await startApi();
if (!(await reachable(base))) await startServer();
const logOffset = existsSync(LOG) ? statSync(LOG).size : 0;
const cookie = `${SESSION_COOKIE}=${await createTestSession()}`;
let failed = 0;

for (const check of checks) {
  const target = check.url ? check.url() : base + check.path;
  const label = `${check.url ? target : check.path} (${check.signedIn ? "signed in" : "signed out"})`;
  let result;
  try {
    const res = await fetch(target, {
      headers: check.signedIn ? { cookie } : {},
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    result = { status: res.status, body: await res.text() };
  } catch (error) {
    console.error(`✗ ${label}: ${error.name === "TimeoutError" ? `no response in ${REQUEST_TIMEOUT_MS / 1000}s` : error.message}`);
    failed++;
    continue;
  }
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

// Exit explicitly: the servers' output pipes would otherwise keep Node running after the
// result is printed. The exit handler stops the servers this run started.
if (failed) {
  console.error(`\n${failed} smoke check(s) failed. Full log: ${LOG}`);
  process.exit(1);
}
console.log("\nAll smoke checks passed");
process.exit(0);
