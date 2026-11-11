#!/usr/bin/env node
// Adds or removes a fixed set of Applications for the dev-session test user, through the API, so
// the dashboard can be seen filled (Pipeline board, Coming up, table, closed Applications).
//   node scripts/dev-applications.mjs add      # refuses if the test user already has Applications
//   node scripts/dev-applications.mjs remove   # deletes every Application the test user has
// Needs the API running at API_URL (default http://localhost:8000) with the same API_SECRET.
// These are dev fixtures for the test user, not Sample Applications (GLOSSARY.md).
import { readFileSync } from "node:fs";
import { SignJWT } from "jose";
import { TEST_JOB_SEEKER_ID } from "./dev-session.mjs";

const apiBase = process.env.API_URL ?? "http://localhost:8000";

function readApiSecret() {
  if (process.env.API_SECRET) return process.env.API_SECRET;
  try {
    const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const match = env.match(/^API_SECRET="?([^"\n]+)"?/m);
    if (match) return match[1];
  } catch {}
  throw new Error("API_SECRET not found in the environment or .env.local");
}

// Same token the Next.js server sends (src/lib/api.ts).
async function token() {
  return new SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(TEST_JOB_SEEKER_ID)
    .setIssuer("bigfoot-web")
    .setAudience("bigfoot-api")
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(new TextEncoder().encode(readApiSecret()));
}

async function call(method, path, body) {
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${await token()}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

/** `days` from today at `hour` local time, so Coming up always lists future rounds. */
function at(days, hour) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function applications() {
  const applied_on = at(-14, 9).slice(0, 10);
  return [
    { company: "Notion", title: "Full-stack Engineer", next_round: "recruiter_screen", next_round_at: at(1, 15) },
    { company: "Datadog", title: "Software Engineer", previous_round: "recruiter_screen", next_round: "technical", next_round_at: at(2, 14) },
    { company: "Figma", title: "Senior Engineer", previous_round: "technical", next_round: "onsite_loop", next_round_at: at(5, 10) },
    { company: "Linear", title: "Product Engineer", previous_round: "hiring_manager", next_round: "behavioural", next_round_at: at(6, 11) },
    { company: "Stripe", title: "Software Engineer II", next_round: "waiting" },
    { company: "Shopify", title: "Senior Developer", previous_round: "informal_chat", next_round: "scheduled" },
    { company: "Ramp", title: "Staff Engineer", stage: "offer", previous_round: "onsite_loop" },
    { company: "Vercel", title: "Frontend Engineer", stage: "rejected", previous_round: "technical" },
    { company: "Plaid", title: "Software Engineer", stage: "withdrawn", previous_round: "recruiter_screen" },
  ].map((a) => ({ applied_on, ...a }));
}

export async function addTestApplications() {
  const existing = await call("GET", "/applications");
  if (existing.length) {
    throw new Error(
      `The test user already has ${existing.length} Applications. ` +
        "Run `node scripts/dev-applications.mjs remove` first if they can go.",
    );
  }
  for (const a of applications()) await call("POST", "/applications", a);
}

export async function removeTestApplications() {
  const existing = await call("GET", "/applications");
  for (const a of existing) await call("DELETE", `/applications/${a.id}`);
  return existing.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  if (command === "add") {
    await addTestApplications();
    console.log(`Added ${applications().length} Applications for the test user.`);
  } else if (command === "remove") {
    console.log(`Removed ${await removeTestApplications()} Applications for the test user.`);
  } else {
    console.error("Usage: node scripts/dev-applications.mjs add|remove");
    process.exit(1);
  }
}
