import { describe, expect, it } from "vitest";
import { worktreePackagesProblem } from "./check-worktree-packages.mjs";

const MAIN = "/repo/.git";
const WORKTREE = "/repo/.git/worktrees/big-140";

describe("worktreePackagesProblem", () => {
  it("lets the main checkout commit, with or without node_modules", () => {
    expect(worktreePackagesProblem({ gitDir: MAIN, commonDir: MAIN, hasNodeModules: true })).toBeNull();
    expect(worktreePackagesProblem({ gitDir: MAIN, commonDir: MAIN, hasNodeModules: false })).toBeNull();
  });

  it("lets a set-up worktree commit", () => {
    expect(worktreePackagesProblem({ gitDir: WORKTREE, commonDir: MAIN, hasNodeModules: true })).toBeNull();
  });

  it("stops a worktree without node_modules and names the setup command", () => {
    const problem = worktreePackagesProblem({ gitDir: WORKTREE, commonDir: MAIN, hasNodeModules: false });
    expect(problem).toContain("no node_modules of its own");
    expect(problem).toContain("npm run worktree:setup");
  });
});
