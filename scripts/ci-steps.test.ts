// CI splits `npm run verify` into jobs (.github/workflows/ci.yml) instead of calling it, so the two
// could drift apart: a step added to `verify` would pass locally and never run in CI.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");
const scripts: Record<string, string> = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts;
const workflow = readFileSync(resolve(ROOT, ".github/workflows/ci.yml"), "utf8");

/** The single-line `run:` commands in a workflow. */
function runCommands(yaml: string): string[] {
  return [...yaml.matchAll(/^\s*(?:-\s+)?run:[ \t]*([^\s|>].*?)\s*$/gm)].map((match) => match[1]);
}

const verifySteps = scripts.verify.split("&&").map((step) => step.trim());

describe("npm run verify and CI", () => {
  it("reads each step of verify", () => {
    expect(verifySteps).toContain("npm run spell");
    expect(verifySteps).toContain("npm run test");
  });

  it.each(verifySteps)("CI runs `%s` in some job", (step) => {
    expect(runCommands(workflow)).toContain(step);
  });

  it("CI runs the steps, not verify or check itself", () => {
    expect(runCommands(workflow).filter((command) => /npm run (verify|check)\b/.test(command))).toEqual([]);
  });

  it("keeps `check` as an alias of verify", () => {
    expect(scripts.check).toContain("npm run verify");
    expect(scripts.check).toContain("deprecated");
  });
});

describe("runCommands", () => {
  it("finds list and mapping forms, not block scalars", () => {
    expect(runCommands("steps:\n  - run: npm run a\n  - if: x\n    run: npm run b -- --c\n  - run: |\n      echo d\n")).toEqual([
      "npm run a",
      "npm run b -- --c",
    ]);
  });
});
