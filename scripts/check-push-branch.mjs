#!/usr/bin/env node
// Fails a push of a branch that is not a Linear branch name (wisamzaghal/big-n-…), before CI's
// PR naming check (scripts/check-pr-naming.mjs) can. A worktree's branch starts as
// `worktree-BIG-n`, so it needs renaming first. Run by .githooks/pre-push, which passes on git's
// stdin: one `<local ref> <local sha> <remote ref> <remote sha>` line per ref pushed.
import { readFileSync } from "node:fs";
import { LINEAR_BRANCH } from "./check-pr-naming.mjs";

/** One problem per branch a push would create or update under a name CI rejects. */
export function pushProblems(stdin) {
  const problems = [];
  for (const line of stdin.split("\n").filter(Boolean)) {
    const [localRef, localSha, remoteRef] = line.split(" ");
    const branch = remoteRef.match(/^refs\/heads\/(.+)$/)?.[1];
    // Tags, deleting a branch and main itself need no ticket.
    if (!branch || branch === "main" || /^0+$/.test(localSha) || LINEAR_BRANCH.test(branch)) continue;
    const ticket = branch.match(/big-(\d+)/i)?.[1] ?? "n";
    const local = localRef.replace(/^refs\/heads\//, "");
    problems.push(
      `branch "${branch}" is not a Linear branch name (wisamzaghal/big-n-…). Rename it to BIG-${ticket}'s ` +
        `branch name from Linear (gitBranchName) and push again: git branch -m ${local} wisamzaghal/big-${ticket}-…`,
    );
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = pushProblems(readFileSync(0, "utf8"));
  for (const problem of problems) console.error(`✗ ${problem}`);
  if (problems.length) process.exit(1);
}
