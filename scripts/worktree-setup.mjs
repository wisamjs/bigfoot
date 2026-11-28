#!/usr/bin/env node
// Readies a fresh git worktree: copies .env.local from the main checkout (untracked, so a new
// worktree has none) and installs this checkout's own node_modules with `npm ci`. Without them
// the dev server fails with "Missing environment variables" or "Could not find the Next.js
// package", and `npm run verify` runs on the main checkout's packages, which can lag this branch
// and fail unrelated tests; the pre-commit hook refuses that case. It also installs the Chromium
// Storybook's story tests (`npm run test-storybook`) run in. An existing .env.local is kept.
// It raises git's HTTP post buffer, as the SessionStart hook in .claude/settings.json does: a
// push that carries PNG screenshots fails with "RPC failed; HTTP 400" at the default size.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
// Every worktree shares the main checkout's .git directory.
const main = dirname(git("rev-parse", "--path-format=absolute", "--git-common-dir"));
const target = resolve(ROOT, ".env.local");
const source = resolve(main, ".env.local");

if (existsSync(target)) {
  console.log("✓ .env.local is already here");
} else if (main !== ROOT && existsSync(source)) {
  copyFileSync(source, target);
  console.log(`✓ copied .env.local from ${main}`);
} else {
  console.error(`✗ no .env.local in ${main} to copy; create one from .env.example (see README.md)`);
  process.exitCode = 1;
}

git("config", "http.postBuffer", "524288000");
console.log("✓ raised git's http.postBuffer for pushes with screenshots");

execFileSync("npm", ["ci"], { cwd: ROOT, stdio: "inherit" });
console.log("✓ installed node_modules");
execFileSync("npx", ["playwright", "install", "chromium"], { cwd: ROOT, stdio: "inherit" });
console.log("✓ installed Chromium for the story tests");
