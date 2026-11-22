#!/usr/bin/env node
// This checkout's test schema: the one `npm run test:api` builds once per run, and the one
// the API that smoke, a11y, capture and screenshots start reads. A BIG ticket branch gets its own
// (bigfoot_test_big<n>), so checkouts running checks side by side never rebuild each other's
// schema mid-run. CI sets TEST_SCHEMA, one per run.
//
//   node scripts/test-schema.mjs pytest [args]   the API tests (npm run test:api)
//   node scripts/test-schema.mjs rebuild         rebuilt from supabase/migrations
//   node scripts/test-schema.mjs drop            dropped (npm run db:drop-test-schema)
import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { LINEAR_BRANCH } from "./check-pr-naming.mjs";

const ROOT = resolve(import.meta.dirname, "..");

/**
 * TEST_SCHEMA when set, else bigfoot_test_big<n> on a BIG ticket branch, else bigfoot_test.
 * @param {string} branch
 * @param {Record<string, string | undefined>} env
 */
export function testSchemaName(branch, env = process.env) {
  if (env.TEST_SCHEMA) return env.TEST_SCHEMA;
  const ticket = branch.match(LINEAR_BRANCH)?.[1];
  return ticket ? `bigfoot_test_big${ticket}` : "bigfoot_test";
}

/** This checkout's test schema. */
export function testSchema() {
  let branch = "";
  try {
    branch = execFileSync("git", ["branch", "--show-current"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {}
  return testSchemaName(branch);
}

/** Runs `uv run <args>` in api/ against this checkout's test schema; returns its exit code. */
function inApi(args) {
  const { status } = spawnSync("uv", ["run", ...args], {
    cwd: resolve(ROOT, "api"),
    stdio: "inherit",
    env: { ...process.env, TEST_SCHEMA: testSchema() },
  });
  return status ?? 1;
}

const COMMANDS = {
  pytest: (args) => ["pytest", ...args],
  rebuild: () => ["python", "-m", "tests.schema"],
  drop: () => ["python", "../scripts/drop-test-schema.py"],
};

/** Rebuilds this checkout's test schema from supabase/migrations, for an API about to start. */
export function rebuildTestSchema() {
  if (inApi(COMMANDS.rebuild()) !== 0) throw new Error(`Couldn't rebuild the test schema ${testSchema()}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [command, ...args] = process.argv.slice(2);
  if (!Object.hasOwn(COMMANDS, command ?? "")) {
    console.error("Usage: node scripts/test-schema.mjs pytest [args] | rebuild | drop");
    process.exit(2);
  }
  process.exit(inApi(COMMANDS[command](args)));
}
