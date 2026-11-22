#!/usr/bin/env node
// Fails unless a PR names its Linear ticket the way AGENTS.md says: the branch is the ticket's
// Linear branch name (wisamzaghal/big-n-…), the title ends with (BIG-n), and the body starts
// with `Closes BIG-n`, all with the same n. Dependabot's PRs have no ticket, so they pass.
// Run by .github/workflows/pr-naming.yml with PR_AUTHOR, PR_BRANCH, PR_TITLE and PR_BODY set.

/** A Linear branch name for a BIG ticket; group 1 is the ticket number. */
export const LINEAR_BRANCH = /^wisamzaghal\/big-(\d+)-/;

/** The GitHub login Dependabot opens its PRs as. */
export const DEPENDABOT = "dependabot[bot]";

/** The ticket numbers a PR's branch, title and body name; a part that doesn't name one is undefined. */
function ticketNumbers({ branch, title, body }) {
  return {
    fromBranch: branch.match(LINEAR_BRANCH)?.[1],
    fromTitle: title.trim().match(/\(BIG-(\d+)\)$/)?.[1],
    fromBody: body.trimStart().match(/^Closes BIG-(\d+)\b/)?.[1],
  };
}

/** Problems with a PR's naming; empty when it is fine. */
export function prNamingProblems({ author = "", branch = "", title = "", body = "" }) {
  if (author === DEPENDABOT) return [];
  const { fromBranch, fromTitle, fromBody } = ticketNumbers({ branch, title, body });
  const problems = [
    !fromBranch && `branch "${branch}" is not a Linear branch name (wisamzaghal/big-n-…)`,
    !fromTitle && `title "${title}" does not end with (BIG-n)`,
    !fromBody && "body does not start with `Closes BIG-n`",
  ].filter(Boolean);
  const numbers = new Set([fromBranch, fromTitle, fromBody].filter(Boolean));
  if (numbers.size > 1) problems.push(`branch, title and body name different tickets: ${[...numbers].map((n) => `BIG-${n}`).join(", ")}`);
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = prNamingProblems({
    author: process.env.PR_AUTHOR,
    branch: process.env.PR_BRANCH,
    title: process.env.PR_TITLE,
    body: process.env.PR_BODY,
  });
  for (const problem of problems) console.error(`✗ ${problem}`);
  if (problems.length) {
    console.error("\nSee the Tickets line in AGENTS.md. Fix the title or body on GitHub and this check reruns.");
    process.exit(1);
  }
  console.log(process.env.PR_AUTHOR === DEPENDABOT ? "✓ Dependabot PR, no ticket needed" : "✓ branch, title and body name the same ticket");
}
