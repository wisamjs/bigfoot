import { describe, expect, it } from "vitest";
import { behindProblem, parseArgs } from "./pr-check.mjs";

describe("behindProblem", () => {
  it("is false for a branch that has all of origin/main", () => {
    expect(behindProblem(0)).toBe(false);
  });

  it("names the fix and counts the commits", () => {
    expect(behindProblem(1)).toContain("1 commit behind origin/main");
    expect(behindProblem(3)).toContain("3 commits behind origin/main");
    expect(behindProblem(3)).toContain("git merge origin/main");
  });
});

describe("parseArgs", () => {
  it("reads a PR number", () => {
    expect(parseArgs(["96"])).toEqual({ pr: "96", bodyFile: undefined, title: undefined });
  });

  it("reads a draft's body file and title", () => {
    expect(parseArgs(["--body-file", "body.md", "--title", "Do it (BIG-1)"])).toEqual({
      pr: undefined,
      bodyFile: "body.md",
      title: "Do it (BIG-1)",
    });
  });
});
