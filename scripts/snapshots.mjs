#!/usr/bin/env node
// Retakes the picture of every Pages story, dark and light, in docs/snapshots/ (scripts/snapshot-store.mjs).
//   npm run snapshots              runs the Pages story files' tests and takes the pictures as they pass
//   node scripts/snapshots.mjs <command…>   takes them during <command> instead: the pre-commit hook
//                                  passes `npm run verify`, whose story tests render every story anyway
// The story tests take the pictures (.storybook/snapshots.ts) only when SNAPSHOTS_LOG is set, as here,
// so CI's story tests take none. When the command passes, pictures of stories that no longer exist
// are removed. A story that errors fails its test, which names it, and nothing is removed.
// Needs no Storybook running: the story tests render in their own Chrome.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { pagesStoryFiles, prune, ROOT, SNAPSHOT_DIR } from "./snapshot-store.mjs";

const command =
  process.argv.length > 2 ? process.argv.slice(2) : ["npx", "vitest", "run", "--project", "storybook", ...pagesStoryFiles()];
const temp = mkdtempSync(join(tmpdir(), "snapshots-"));
try {
  process.exitCode = run(join(temp, "written.txt"));
} finally {
  rmSync(temp, { recursive: true, force: true });
}

/** Runs the command with SNAPSHOTS_LOG set to `log`, then prunes; returns the exit code. */
function run(log) {
  const started = Date.now();
  const { status } = spawnSync(command[0], command.slice(1), { cwd: ROOT, stdio: "inherit", env: { ...process.env, SNAPSHOTS_LOG: log } });
  if (status !== 0) return status ?? 1;
  const lines = existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(Boolean) : [];
  if (lines.length === 0) {
    console.error("No Pages story was pictured: is there a Pages/ story, and did the story tests run?");
    return 1;
  }
  const removed = prune(new Set(lines.map((line) => line.split(" ")[0])));
  const count = (result) => lines.filter((line) => line.endsWith(` ${result}`)).length;
  const where = relative(process.cwd(), SNAPSHOT_DIR) || SNAPSHOT_DIR;
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  console.log(
    `Snapshots: ${lines.length} pictures in ${where}: ${count("added")} added, ${count("changed")} changed, ` +
      `${removed.length} removed (${seconds}s)`,
  );
  for (const path of removed) console.log(`  removed ${path}`);
  return 0;
}
