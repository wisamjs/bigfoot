#!/usr/bin/env node
// Stops a commit from a git worktree that has no node_modules of its own. Node then resolves
// packages from the main checkout, which were installed for whatever main was then, so the
// check fails on tests the change never touched (BIG-138). Run by .githooks/pre-commit.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The problem with committing from this checkout, or null when there is none.
 * `gitDir` and `commonDir` are absolute: they differ only in a linked worktree.
 */
export function worktreePackagesProblem({ gitDir, commonDir, hasNodeModules }) {
  if (gitDir === commonDir || hasNodeModules) return null;
  return "this worktree has no node_modules of its own, so the check would run on the main checkout's packages. Run `npm run worktree:setup`, then commit again.";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const git = (flag) => execFileSync("git", ["rev-parse", "--path-format=absolute", flag], { encoding: "utf8" }).trim();
  const root = git("--show-toplevel");
  const problem = worktreePackagesProblem({
    gitDir: git("--git-dir"),
    commonDir: git("--git-common-dir"),
    hasNodeModules: existsSync(resolve(root, "node_modules")),
  });
  if (problem) {
    console.error(`✗ ${problem}`);
    process.exit(1);
  }
}
