import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setupProblems } from "./servers.mjs";

describe("setupProblems", () => {
  let root: string;
  const install = () => {
    mkdirSync(join(root, "node_modules/next"), { recursive: true });
    writeFileSync(join(root, "node_modules/next/package.json"), "{}");
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "bigfoot-setup-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("names both gaps of a fresh worktree", () => {
    expect(setupProblems(root, {})).toEqual(["node_modules is not installed", ".env.local is missing"]);
  });

  it("finds nothing once packages are installed and .env.local is there", () => {
    install();
    writeFileSync(join(root, ".env.local"), "");
    expect(setupProblems(root, {})).toEqual([]);
  });

  it("needs no .env.local when the environment carries the secrets, as in CI", () => {
    install();
    expect(setupProblems(root, { AUTH_SECRET: "ci" })).toEqual([]);
  });
});
