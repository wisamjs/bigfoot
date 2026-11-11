#!/usr/bin/env node
// Prints an Auth.js session-cookie value for a fake test user, signed with AUTH_SECRET.
// Use it to load signed-in pages locally without Google:
//   curl -b "authjs.session-token=$(node scripts/dev-session.mjs)" http://localhost:3300/dashboard
// Works only against a server using the same AUTH_SECRET (.env.local or the environment).
import { readFileSync } from "node:fs";
import { encode } from "@auth/core/jwt";

export const SESSION_COOKIE = "authjs.session-token";
/** The test user's job seeker id (token.sub), which scopes their Applications in the API. */
export const TEST_JOB_SEEKER_ID = "test-user";

export function readAuthSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  try {
    const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const match = env.match(/^AUTH_SECRET="?([^"\n]+)"?/m);
    if (match) return match[1];
  } catch {}
  throw new Error("AUTH_SECRET not found in the environment or .env.local");
}

export async function createTestSession() {
  return encode({
    secret: readAuthSecret(),
    salt: SESSION_COOKIE,
    token: { name: "Test User", email: "test.user@example.test", picture: null, sub: TEST_JOB_SEEKER_ID },
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(await createTestSession());
}
