#!/usr/bin/env node
// Says whether a PR needs the owner's manual approval: no when every changed file is a `.md`
// file, yes for anything else (and for an empty list). This is the one definition of "needs
// review"; a new rule (a larger diff, auth or migration code) goes in `needsReview`.
// Run by the `classify` job in .github/workflows/ci.yml: changed paths on stdin, one per line;
// prints `review=true` or `review=false`, ready to append to $GITHUB_OUTPUT.

import { posix } from "node:path";

/** True when the path, once `.` and `..` are resolved, stays in the repo and ends in `.md`. */
export function isDoc(path) {
  const clean = posix.normalize(path.trim());
  if (clean === ".." || clean.startsWith("../") || clean.startsWith("/")) return false;
  return clean.endsWith(".md") && !clean.endsWith("/");
}

/** True unless the list is non-empty and every path is a `.md` file. A renamed file must be
 * listed under both its old and new path, so moving code into a `.md` name still needs review. */
export function needsReview(paths) {
  return paths.length === 0 || !paths.every(isDoc);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  const paths = input.split("\n").filter((line) => line.trim() !== "");
  console.log(`review=${needsReview(paths)}`);
}
