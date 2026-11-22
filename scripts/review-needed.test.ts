import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { isDoc, needsReview } from "./review-needed.mjs";

describe("needsReview", () => {
  it("does not need review when every path is a .md file", () => {
    expect(needsReview(["README.md", "docs/guide.md", "GLOSSARY.md"])).toBe(false);
  });

  it("needs review when one path is not a .md file", () => {
    expect(needsReview(["README.md", "src/app/page.tsx"])).toBe(true);
  });

  it("needs review for an empty list", () => {
    expect(needsReview([])).toBe(true);
  });

  it("needs review when a deleted or renamed file was code, listed by its old path", () => {
    expect(needsReview(["docs/notes.md", "src/old.ts"])).toBe(true);
    expect(needsReview(["docs/old.md", "docs/new.md"])).toBe(false);
  });

  it("is not fooled by paths that only look like docs", () => {
    expect(needsReview(["README.md/../package.json"])).toBe(true);
    expect(needsReview(["notes.md.js"])).toBe(true);
    expect(needsReview(["docs/notes.md/"])).toBe(true);
    expect(needsReview(["../outside.md"])).toBe(true);
    expect(needsReview(["/etc/passwd.md"])).toBe(true);
    expect(needsReview(["README.md/.."])).toBe(true);
    expect(needsReview(["README.MD"])).toBe(true);
  });
});

describe("isDoc", () => {
  it("accepts a .md path that normalizes to a .md path", () => {
    expect(isDoc("docs/../README.md")).toBe(true);
  });
});

describe("the command line", () => {
  const run = (input: string) =>
    execFileSync("node", ["scripts/review-needed.mjs"], { input, encoding: "utf8" }).trim();

  it("prints review=false for .md-only paths", () => {
    expect(run("README.md\ndocs/a.md\n")).toBe("review=false");
  });

  it("prints review=true for other paths and for no paths", () => {
    expect(run("README.md\npackage.json\n")).toBe("review=true");
    expect(run("")).toBe("review=true");
  });
});
