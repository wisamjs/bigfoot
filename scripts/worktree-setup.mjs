#!/usr/bin/env node
// Readies a fresh git worktree for `npm run smoke` and `npm run a11y`: copies .env.local from the
// main checkout (untracked, so a new worktree has none) and installs this checkout's own
// node_modules with `npm ci`. Without them the dev server fails with "Missing environment
// variables" or "Could not find the Next.js package", while `npm run check` still
// passes on packages resolved from the main checkout. An existing .env.local is kept.
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

execFileSync("npm", ["ci"], { cwd: ROOT, stdio: "inherit" });
console.log("✓ installed node_modules");
