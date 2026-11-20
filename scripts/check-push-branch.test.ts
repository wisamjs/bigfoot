import { describe, expect, it } from "vitest";
import { pushProblems } from "./check-push-branch.mjs";

const SHA = "64481ec0000000000000000000000000000000aa";
const ZERO = "0".repeat(40);
const push = (branch: string, localSha = SHA) => `refs/heads/${branch} ${localSha} refs/heads/${branch} ${ZERO}\n`;

describe("pushProblems", () => {
  it("accepts a Linear branch name", () => {
    expect(pushProblems(push("wisamzaghal/big-48-turn-the-big-47-retro-into-checks"))).toEqual([]);
  });

  it("rejects a worktree branch and names the rename for its ticket", () => {
    const [problem, ...rest] = pushProblems(push("worktree-BIG-48"));
    expect(rest).toEqual([]);
    expect(problem).toContain('branch "worktree-BIG-48" is not a Linear branch name');
    expect(problem).toContain("git branch -m worktree-BIG-48 wisamzaghal/big-48-…");
  });

  it("judges the name pushed to, not the local one", () => {
    const line = `refs/heads/worktree-BIG-48 ${SHA} refs/heads/wisamzaghal/big-48-checks ${ZERO}\n`;
    expect(pushProblems(line)).toEqual([]);
  });

  it("lets main, tags and branch deletions through", () => {
    const tag = `refs/tags/v1 ${SHA} refs/tags/v1 ${ZERO}\n`;
    expect(pushProblems(push("main") + tag + push("claude/old-branch", ZERO))).toEqual([]);
  });

  it("accepts a push of nothing", () => {
    expect(pushProblems("")).toEqual([]);
  });
});
