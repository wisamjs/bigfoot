import { describe, expect, it } from "vitest";
import { safeNext, signInHref } from "./safe-next";

describe("safeNext", () => {
  it.each([
    "/dashboard",
    "/dashboard?month=2026-12&day=2026-12-04",
    "/applications/a1/interviews/i1",
    "/account#tokens",
  ])("follows a path on Bigfoot: %s", (path) => {
    expect(safeNext(path)).toBe(path);
  });

  it.each([
    ["an absolute URL", "https://evil.example/dashboard"],
    ["a protocol-relative URL", "//evil.example"],
    ["a backslash read as a slash", "/\\evil.example"],
    ["a scheme", "data:text/html,hi"],
    ["a tab the URL parser drops, leaving //", "/\t/evil.example"],
    ["a relative path", "dashboard"],
    ["nothing", ""],
    ["no value", undefined],
    ["a list of values", ["/dashboard"]],
  ])("falls back to the dashboard for %s", (_, value) => {
    expect(safeNext(value)).toBe("/dashboard");
  });
});

describe("signInHref", () => {
  it("carries the path, with its search, in next", () => {
    const url = new URL(signInHref("/dashboard?month=2026-12"), "http://localhost");
    expect(url.pathname).toBe("/sign-in");
    expect(url.searchParams.get("next")).toBe("/dashboard?month=2026-12");
  });
});
