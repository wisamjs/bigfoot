#!/usr/bin/env node
// Prints an API bearer token for the dev-session test user, signed with API_SECRET, to paste into
// Authorize on the API docs (http://localhost:8000/docs, with API_DOCS=true):
//   node scripts/dev-api-token.mjs          # valid for an hour
//   curl -H "authorization: Bearer $(node scripts/dev-api-token.mjs)" http://localhost:8000/applications
// Works only against an API using the same API_SECRET (.env.local or the environment).
import { readFileSync } from "node:fs";
import { SignJWT } from "jose";
import { TEST_JOB_SEEKER_ID } from "./dev-session.mjs";

export function readApiSecret() {
  if (process.env.API_SECRET) return process.env.API_SECRET;
  try {
    const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const match = env.match(/^API_SECRET="?([^"\n]+)"?/m);
    if (match) return match[1];
  } catch {}
  throw new Error("API_SECRET not found in the environment or .env.local");
}

/** The token the Next.js server sends (src/lib/api.ts), naming `jobSeekerId`. */
export async function apiToken(jobSeekerId = TEST_JOB_SEEKER_ID, expiresIn = "60s") {
  return new SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(jobSeekerId)
    .setIssuer("bigfoot-web")
    .setAudience("bigfoot-api")
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(readApiSecret()));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(await apiToken(TEST_JOB_SEEKER_ID, "1h"));
}
