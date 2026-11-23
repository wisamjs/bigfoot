#!/usr/bin/env node
// Runs, before CI does, what CI would reject about a PR: its naming (scripts/check-pr-naming.mjs)
// and whether its branch is behind origin/main (CI tests the merge, so a story or test that main
// gained since the branch was cut fails there and not here).
//   npm run pr-check                          the current branch's open PR
//   npm run pr-check -- <pr>                  PR <pr>
//   npm run pr-check -- --body-file <file> --title "<title>"   a draft, before `gh pr create`
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { prNamingProblems } from "./check-pr-naming.mjs";

/** The problem with a branch that is `behind` commits behind origin/main, or false. */
export function behindProblem(behind) {
  return behind > 0 && `branch is ${behind} commit${behind === 1 ? "" : "s"} behind origin/main; run \`git merge origin/main\`, rerun the checks, then push`;
}

/** Reads `--body-file <file>`, `--title <title>` and a PR number from the arguments. */
export function parseArgs(args) {
  const parsed = { pr: undefined, bodyFile: undefined, title: undefined };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--body-file") parsed.bodyFile = args[++i];
    else if (args[i] === "--title") parsed.title = args[++i];
    else parsed.pr = args[i];
  }
  return parsed;
}

const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();

if (import.meta.url === `file://${process.argv[1]}`) {
  const { pr, bodyFile, title } = parseArgs(process.argv.slice(2));
  let fields;
  if (bodyFile) {
    fields = {
      author: run("gh", ["api", "user", "--jq", ".login"]),
      branch: run("git", ["branch", "--show-current"]),
      title: title ?? "",
      body: readFileSync(bodyFile, "utf8"),
    };
  } else {
    const view = JSON.parse(run("gh", ["pr", "view", ...(pr ? [pr] : []), "--json", "author,headRefName,title,body"]));
    fields = { author: view.author.login, branch: view.headRefName, title: view.title, body: view.body };
  }
  run("git", ["fetch", "-q", "origin", "main"]);
  const behind = Number(run("git", ["rev-list", "--count", "HEAD..origin/main"]));
  const problems = [...prNamingProblems(fields), behindProblem(behind)].filter(Boolean);
  for (const problem of problems) console.error(`✗ ${problem}`);
  if (problems.length) process.exit(1);
  console.log("✓ PR naming is right and the branch has origin/main");
}
