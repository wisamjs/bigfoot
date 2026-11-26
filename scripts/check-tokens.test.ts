import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { componentProblems, paletteProblems } from "./check-tokens.mjs";

/** A globals.css with the given base, role and theme declarations, in the real file's tiers. */
function css({ base = "", roles = "", theme = "", shadcn = "", rest = "" }) {
  return `/* @tokens base */\n:root {\n${base}\n}\n/* @tokens roles */\n:root {\n${roles}\n}\n/* @tokens shadcn */\n:root {\n${shadcn}\n}\n/* @tokens theme */\n@theme inline {\n${theme}\n}\n${rest}`;
}

const BASE = "--pink-800: #4f1135;\n--mauve-50: #faebf1;";
const ROLES = "--brand: var(--pink-800);\n--surface: var(--mauve-50);";
const THEME = "--color-brand: var(--brand);\n--color-surface: var(--surface);";

describe("paletteProblems", () => {
  it("passes roles that point at base steps and are used as utilities", () => {
    expect(paletteProblems({ css: css({ base: BASE, roles: ROLES, theme: THEME }), sources: ['<div className="bg-surface hover:text-brand/80" />'] })).toEqual([]);
  });

  it("fails a raw colour outside the base block, in a role or in component CSS", () => {
    const problems = paletteProblems({
      css: css({ base: BASE, roles: `${ROLES}\n--card: #f5d6e3;`, theme: THEME, rest: ".x { color: rgba(0, 0, 0, 0.5); background: var(--card); }" }),
      sources: ["bg-surface text-brand"],
    });
    expect(problems).toEqual([expect.stringContaining('"#f5d6e3" outside the base block'), expect.stringContaining('"rgba(" outside the base block')]);
  });

  it("fails two base steps with one value, ignoring case", () => {
    const problems = paletteProblems({
      css: css({ base: `${BASE}\n--pink-50: #FAEBF1;`, roles: `${ROLES}\n--soft: var(--pink-50);`, theme: THEME, rest: ".y { color: var(--soft); }" }),
      sources: ["bg-surface text-brand"],
    });
    expect(problems).toEqual([expect.stringContaining("--pink-50 repeats --mauve-50")]);
  });

  it("fails a token nothing uses, counting the @theme mapping as no use", () => {
    expect(paletteProblems({ css: css({ base: BASE, roles: ROLES, theme: THEME }), sources: ["bg-surface"] })).toEqual([
      expect.stringContaining("--brand is unused"),
    ]);
  });

  it("fails a base step that no role points at", () => {
    expect(paletteProblems({ css: css({ base: `${BASE}\n--red-50: #fdecec;`, roles: ROLES, theme: THEME }), sources: ["bg-surface text-brand"] })).toEqual([
      expect.stringContaining("--red-50 is unused"),
    ]);
  });

  it("counts shadow utilities by their own name, and leaves shadcn's variables alone", () => {
    const problems = paletteProblems({
      css: css({
        base: BASE,
        roles: `${ROLES}\n--shadow-xs: 0 1px color-mix(in srgb, var(--pink-800) 10%, transparent);`,
        theme: `${THEME}\n--shadow-xs: var(--shadow-xs);`,
        shadcn: "--destructive: var(--brand);",
      }),
      sources: ["bg-surface text-brand shadow-xs"],
    });
    expect(problems).toEqual([]);
  });

  it("passes the real globals.css", () => {
    expect(execFileSync("node", ["scripts/check-tokens.mjs"], { encoding: "utf8" })).toContain("Design tokens: OK");
  });
});

describe("componentProblems", () => {
  const real = readFileSync("src/app/globals.css", "utf8");

  it("fails raw colours, ad-hoc radii and shadows Bigfoot doesn't define", () => {
    const problems = componentProblems(real, [{ path: "a.tsx", text: 'const a = "#fff";\n<div className="rounded-[3px] shadow-sm" />' }]);
    expect(problems).toEqual([
      expect.stringContaining('a.tsx:1  "#fff"'),
      expect.stringContaining('a.tsx:2  "rounded-["'),
      expect.stringContaining('a.tsx:2  "shadow-sm"'),
    ]);
  });

  it("passes token utilities", () => {
    expect(componentProblems(real, [{ path: "b.tsx", text: '<div className="bg-card rounded-card shadow-md" />' }])).toEqual([]);
  });
});
