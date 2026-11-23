#!/usr/bin/env node
// Prints what failed in a PR's latest CI runs, small enough to read in one go: for each failed job,
// the tail of its failed steps' logs without the colour codes, timestamps and job/step prefixes
// `gh run view --log-failed` puts on every line.
//   npm run ci-failures                the current branch's latest runs
//   npm run ci-failures -- <pr>        PR <pr>'s
import { execFileSync } from "node:child_process";

/** Lines of each failed job's log kept from its end, where the exit status and often the error are. */
export const TAIL_LINES = 25;

/** Error lines kept from anywhere in a job's log: a failing test's message can sit well above the tail. */
export const ERROR_LINES = 15;

const ERROR = /\b(FAIL|Error|AssertionError)\b|✗|×|##\[error\]/;

const ANSI = /\x1b\[[0-9;]*m|\^\[\[[0-9;]*m/g;
const TIMESTAMP = /^﻿?\d{4}-\d\d-\d\dT[\d:.]+Z ?/;

/**
 * `gh run view --log-failed` output as one section per job: each line is
 * `<job>\t<step>\t<timestamp> <text>`. Colour codes and timestamps go, the job heads its section,
 * and a section keeps the first few error lines, then its last `tail` lines.
 */
export function digest(log, tail = TAIL_LINES) {
  const jobs = new Map();
  for (const line of log.split("\n")) {
    const [job, step, ...rest] = line.split("\t");
    if (!job || step === undefined || !rest.length) continue;
    const text = rest.join("\t").replace(ANSI, "").replace(TIMESTAMP, "").trimEnd();
    if (!text) continue;
    jobs.set(job, [...(jobs.get(job) ?? []), text]);
  }
  return [...jobs].map(([job, lines]) => `== ${job}\n${section(lines, tail)}`).join("\n\n");
}

/** A job's error lines not already in its tail, then the tail, with a gap marked between them. */
function section(lines, tail) {
  const tailStart = Math.max(lines.length - tail, 0);
  const errors = lines.slice(0, tailStart).filter((text) => ERROR.test(text)).slice(0, ERROR_LINES);
  const kept = lines.slice(tailStart);
  return (errors.length ? [...errors, "…", ...kept] : kept).join("\n");
}

const gh = (...args) => execFileSync("gh", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();

if (import.meta.url === `file://${process.argv[1]}`) {
  const pr = process.argv[2];
  const branch = pr
    ? JSON.parse(gh("pr", "view", pr, "--json", "headRefName")).headRefName
    : execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
  const runs = JSON.parse(gh("run", "list", "--branch", branch, "--limit", "10", "--json", "databaseId,workflowName,conclusion,headSha"));
  const latest = runs.filter((r) => r.headSha === runs[0]?.headSha);
  const failed = latest.filter((r) => r.conclusion === "failure");
  if (!failed.length) {
    console.log(latest.length ? `✓ nothing failed in the latest runs of ${branch}` : `no runs for ${branch} yet`);
  }
  for (const r of failed) {
    console.log(`# ${r.workflowName} (run ${r.databaseId})\n${digest(gh("run", "view", String(r.databaseId), "--log-failed"))}\n`);
  }
}
