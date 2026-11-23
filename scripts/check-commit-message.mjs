#!/usr/bin/env node
// Stops a commit whose message links a Claude Code session: the repo is public and the session
// is private. Cloud sessions add a `Claude-Session: https://claude.ai/code/session_…` trailer
// (BIG-157). Run by .githooks/commit-msg, which passes the message file's path.
import { readFileSync } from "node:fs";
import { SESSION_LINK } from "./check-pr-naming.mjs";

/** The problem with a commit message, or null when there is none. Git's `#` comment lines are ignored. */
export function commitMessageProblem(message) {
  const lines = message.split("\n").filter((line) => !line.startsWith("#"));
  const line = lines.find((l) => SESSION_LINK.test(l));
  if (!line) return null;
  return `the commit message links a Claude Code session, which this public repo must not carry. Remove this line and commit again:\n  ${line.trim()}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problem = commitMessageProblem(readFileSync(process.argv[2], "utf8"));
  if (problem) {
    console.error(`✗ ${problem}`);
    process.exit(1);
  }
}
