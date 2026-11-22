import { describe, expect, it } from "vitest";
import { commitMessageProblem } from "./check-commit-message.mjs";

const TRAILER = "Claude-Session: https://claude.ai/code/session_01G6LSzpc1xaoGqHGnY5gHFq";

describe("commitMessageProblem", () => {
  it("accepts a message without a session link", () => {
    expect(commitMessageProblem("Add a check (BIG-157)\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n")).toBeNull();
  });

  it("rejects a session trailer and quotes the line to remove", () => {
    const problem = commitMessageProblem(`Add a check (BIG-157)\n\n${TRAILER}\n`);
    expect(problem).toContain("links a Claude Code session");
    expect(problem).toContain(TRAILER);
  });

  it("ignores git's comment lines", () => {
    expect(commitMessageProblem(`Add a check (BIG-157)\n# ${TRAILER}\n`)).toBeNull();
  });
});
