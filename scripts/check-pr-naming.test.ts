import { describe, expect, it } from "vitest";
import { prNamingProblems } from "./check-pr-naming.mjs";

const ok = {
  branch: "wisamzaghal/big-35-turn-the-big-3-retro-into-checks-backed",
  title: "Turn the BIG-3 retro into checks (BIG-35)",
  body: "Closes BIG-35\n\nWhy…",
};

describe("prNamingProblems", () => {
  it("accepts a PR that names one ticket everywhere", () => {
    expect(prNamingProblems(ok)).toEqual([]);
  });

  it("rejects a branch that isn't a Linear branch name", () => {
    expect(prNamingProblems({ ...ok, branch: "claude/sleepy-lamport-gs71fb" })).toHaveLength(1);
  });

  it("rejects a title without (BIG-n) at the end", () => {
    expect(prNamingProblems({ ...ok, title: "BIG-35: Turn the retro into checks" })).toHaveLength(1);
  });

  it("rejects a body that doesn't start with Closes BIG-n", () => {
    expect(prNamingProblems({ ...ok, body: "## Summary\nCloses BIG-35" })).toHaveLength(1);
  });

  it("rejects different ticket numbers", () => {
    expect(prNamingProblems({ ...ok, body: "Closes BIG-34" })).toEqual([
      "branch, title and body name different tickets: BIG-35, BIG-34",
    ]);
  });

  it("does not read BIG-3 as the start of BIG-35", () => {
    expect(prNamingProblems({ ...ok, body: "Closes BIG-3" })).toHaveLength(1);
  });

  it("accepts a Dependabot PR, which has no ticket", () => {
    expect(
      prNamingProblems({
        author: "dependabot[bot]",
        branch: "dependabot/npm_and_yarn/multi-f0fdbaf0b1",
        title: "Bump minimatch and typescript-eslint",
        body: "Bumps [minimatch]…",
      }),
    ).toEqual([]);
  });

  it("still checks a person's PR on a dependabot/ branch", () => {
    expect(prNamingProblems({ author: "wisamjs", branch: "dependabot/npm_and_yarn/x", title: "Bump x", body: "" })).toHaveLength(3);
  });

  it("rejects a body that links a Claude Code session", () => {
    const body = `${ok.body}\n\nClaude-Session: https://claude.ai/code/session_01G6LSzpc1xaoGqHGnY5gHFq`;
    expect(prNamingProblems({ ...ok, body })).toEqual([
      "body links a Claude Code session (claude.ai/code/session_…); remove that line",
    ]);
  });

  it("reports everything when nothing is set", () => {
    expect(prNamingProblems({})).toHaveLength(3);
  });
});
