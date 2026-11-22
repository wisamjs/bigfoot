#!/usr/bin/env node
// Smoke test: request every page in scripts/pages.mjs, plus the auth and API endpoints below,
// then fail on any server error
// logged while serving them. Catches request-time render errors that build and lint miss
// (e.g. Cache Components prerender errors, which are logged by the dev server, not returned
// in the response).
//
// Uses this checkout's dev server and API via scripts/servers.mjs: SMOKE_URL
// (default http://localhost:3300) and API_URL (default http://localhost:8000) when they serve this
// checkout, otherwise its own on free ports. A started API reads the test schema
// (scripts/test-schema.mjs), rebuilt as it starts.
// Server errors are read from .next/dev/logs/next-development.log, which every dev server writes.
import { existsSync, readFileSync, statSync } from "node:fs";
import { withTestApplications } from "./dev-applications.mjs";
import { createTestSession, SESSION_COOKIE } from "./dev-session.mjs";
import { pagePath } from "./page-path.mjs";
import { PAGES } from "./pages.mjs";
import { ensureServers } from "./servers.mjs";

const { base, apiBase } = await ensureServers(
  process.env.SMOKE_URL ?? "http://localhost:3300",
  process.env.API_URL ?? "http://localhost:8000",
);
const LOG = ".next/dev/logs/next-development.log";
// Not the dev-session test user, so whatever that user has stays as it was. Holds the Applications
// that pages with an `application` open (scripts/page-path.mjs).
const DATA_JOB_SEEKER_ID = "smoke-user";
// Generous enough for a first compile in `next dev`; short enough that a hung request fails fast.
const REQUEST_TIMEOUT_MS = 20_000;

const checks = [
  ...PAGES.map((page) => ({
    ...page,
    expect:
      typeof page.redirect === "string"
        ? (r) => r.status >= 300 && r.status < 400 && new URL(r.location ?? "", base).pathname === page.redirect
        : page.redirect
          ? (r) => r.body.includes("NEXT_REDIRECT")
          : (r) => r.status === 200 && r.body.includes(page.expect),
  })),
  { path: "/api/auth/providers", signedIn: false, expect: (r) => r.status === 200 && r.body.includes('"google"') },
  // The API rejects requests without a token from the Next.js server.
  { url: () => `${apiBase}/applications`, signedIn: false, expect: (r) => r.status === 401 },
];

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

const logOffset = existsSync(LOG) ? statSync(LOG).size : 0;
const cookie = `${SESSION_COOKIE}=${await createTestSession()}`;
const needsData = checks.some((check) => check.application);
const dataCookie = needsData ? `${SESSION_COOKIE}=${await createTestSession(DATA_JOB_SEEKER_ID)}` : "";
let failed = 0;

async function runChecks() {
  for (const check of checks) {
    const path = check.url ? null : await pagePath(check, DATA_JOB_SEEKER_ID);
    const target = check.url ? check.url() : base + path;
    const label = `${check.url ? target : path} (${check.signedIn ? "signed in" : "signed out"})`;
    let result;
    try {
      const res = await fetch(target, {
        headers: check.signedIn ? { cookie: check.application ? dataCookie : cookie } : {},
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      result = { status: res.status, location: res.headers.get("location"), body: await res.text() };
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
}

if (needsData) await withTestApplications(DATA_JOB_SEEKER_ID, runChecks);
else await runChecks();

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
