import { describe, expect, it } from "vitest";
import { isReadmeOnly } from "./ci-docs-only.mjs";

describe("isReadmeOnly", () => {
  it("accepts a PR that changes only README files, at any depth", () => {
    expect(isReadmeOnly(["README.md"])).toBe(true);
    expect(isReadmeOnly(["README.md", "api/readme.md", "docs/README"])).toBe(true);
  });

  it("rejects a PR that changes anything else too", () => {
    expect(isReadmeOnly(["README.md", "src/app/page.tsx"])).toBe(false);
  });

  it("rejects other docs and look-alike names", () => {
    expect(isReadmeOnly(["docs/guidelines/ux.md"])).toBe(false);
    expect(isReadmeOnly(["README.md.bak"])).toBe(false);
    expect(isReadmeOnly(["src/NOT-README.md"])).toBe(false);
  });

  it("rejects a PR with no files", () => {
    expect(isReadmeOnly([])).toBe(false);
  });
});
