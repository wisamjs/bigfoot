import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PAGES } from "./pages.mjs";

/** `src/app/(legal)/privacy/page.tsx` -> `/privacy`. Route groups and slots don't add a segment. */
function route(file: string) {
  const segments = file
    .split("/")
    .slice(0, -1)
    .filter((s) => !s.startsWith("(") && !s.startsWith("@"));
  return `/${segments.join("/")}`;
}

const routes = readdirSync("src/app", { recursive: true, encoding: "utf8" })
  .map((f) => f.replaceAll("\\", "/"))
  .filter((f) => f === "page.tsx" || f.endsWith("/page.tsx"))
  .map(route)
  .sort();

describe("scripts/pages.mjs", () => {
  it("finds the app's pages", () => {
    expect(routes).toContain("/");
  });

  it.each(routes)("lists %s signed out and signed in", (path) => {
    expect(path, "dynamic routes need an example path in PAGES; extend this test").not.toMatch(/\[/);
    const states = PAGES.filter((p) => p.path === path).map((p) => p.signedIn);
    expect(states, `add ${path} to PAGES in scripts/pages.mjs for both states`).toEqual(
      expect.arrayContaining([false, true]),
    );
  });

  it("lists only routes that exist", () => {
    for (const page of PAGES) expect(routes).toContain(page.path);
  });
});
