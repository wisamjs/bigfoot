#!/usr/bin/env node
// Tells CI's `check` job whether a PR changes nothing but README files, so it can skip the
// install, `npm run check`, smoke, a11y and build and still report `check` green (the main ruleset
// requires it, so the job must run; skipping the whole workflow would leave it pending forever).
// Writes `docs_only=true|false` to $GITHUB_OUTPUT. Pushes to main and PRs with any other file
// always run everything. Run by .github/workflows/ci.yml with GH_TOKEN, REPO and PR_NUMBER set.
import { appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/** A README at any depth: README, README.md, readme.md, README.txt. */
const README = /(^|\/)readme(\.[a-z]+)?$/i;

/** True when the PR changed at least one file and every changed file is a README. */
export function isReadmeOnly(files) {
  return files.length > 0 && files.every((file) => README.test(file));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { REPO, PR_NUMBER, GITHUB_OUTPUT } = process.env;
  let docsOnly = false;
  if (REPO && PR_NUMBER) {
    // `previous_filename` covers a rename out of a README, which still changes a non-README path.
    const out = execFileSync(
      "gh",
      ["api", "--paginate", `repos/${REPO}/pulls/${PR_NUMBER}/files`, "--jq", ".[] | .filename, (.previous_filename // empty)"],
      { encoding: "utf8" },
    );
    docsOnly = isReadmeOnly(out.split("\n").filter(Boolean));
  }
  console.log(docsOnly ? "README-only PR: skipping the slow steps" : "Running every step");
  if (GITHUB_OUTPUT) appendFileSync(GITHUB_OUTPUT, `docs_only=${docsOnly}\n`);
}
