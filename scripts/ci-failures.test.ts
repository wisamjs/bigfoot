import { describe, expect, it } from "vitest";
import { digest } from "./ci-failures.mjs";

const line = (job: string, step: string, text: string) => `${job}\t${step}\t2026-11-23T01:28:24.5Z ${text}`;

describe("digest", () => {
  it("drops timestamps, colour codes and the job and step prefixes", () => {
    const log = line("storybook", "Run tests", "^[[31m×^[[39m Save Detail");
    expect(digest(log)).toBe("== storybook\n× Save Detail");
  });

  it("drops real escape codes and a byte-order mark too", () => {
    const log = `storybook\tRun\t﻿2026-11-23T01:28:24Z \x1b[1mFAIL\x1b[22m x`;
    expect(digest(log)).toBe("== storybook\nFAIL x");
  });

  it("groups lines by job, in the order the jobs first appear", () => {
    const log = [line("a", "s", "one"), line("b", "s", "two"), line("a", "s", "three")].join("\n");
    expect(digest(log)).toBe("== a\none\nthree\n\n== b\ntwo");
  });

  it("keeps only the last lines of a long job log", () => {
    const log = [1, 2, 3, 4, 5].map((n) => line("a", "s", `line ${n}`)).join("\n");
    expect(digest(log, 2)).toBe("== a\nline 4\nline 5");
  });

  it("keeps error lines from above the tail, with a gap marked", () => {
    const log = [line("a", "s", "FAIL Save Detail"), ...[1, 2, 3].map((n) => line("a", "s", `<div ${n}>`))].join("\n");
    expect(digest(log, 2)).toBe("== a\nFAIL Save Detail\n…\n<div 2>\n<div 3>");
  });

  it("skips blank lines and lines without a job and step", () => {
    expect(digest(["", "stray", line("a", "s", "   "), line("a", "s", "kept")].join("\n"))).toBe("== a\nkept");
  });
});
