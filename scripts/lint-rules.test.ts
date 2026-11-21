// The lint rules that are on, as a snapshot: a change to eslint.config.mjs or a plugin upgrade
// that turns rules on or off shows up in review, next to CODING_STANDARDS.md ("Lint rule groups").
// After a deliberate change, update it with `npx vitest run scripts/lint-rules.test.ts -u`.
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();

/** Names of the rules that are on for `file`, sorted. */
async function rulesOn(file: string) {
  const { rules = {} } = (await eslint.calculateConfigForFile(file)) as { rules?: Record<string, unknown> };
  return Object.entries(rules)
    .filter(([, setting]) => {
      const level = Array.isArray(setting) ? setting[0] : setting;
      return level !== 0 && level !== "off";
    })
    .map(([name]) => name)
    .toSorted();
}

const FILES = ["src/components/modal.tsx", "src/components/modal.test.tsx"];

describe.each(FILES)("lint rules on for %s", (file) => {
  it("match the snapshot", async () => {
    expect(await rulesOn(file)).toMatchSnapshot();
  });

  it("report each problem once: no react-hooks rule is on beside its ESLint React copy", async () => {
    const on = new Set(await rulesOn(file));
    const twice = [...on]
      .filter((name) => name.startsWith("react-hooks/"))
      .filter((name) => on.has(name.replace("react-hooks/", "@eslint-react/")));
    expect(twice).toEqual([]);
  });
});
