// The lint rules that are on, as a snapshot: a change to eslint.config.mjs or a plugin upgrade
// that turns rules on or off shows up in review, next to CODING_STANDARDS.md ("Lint rule groups").
// After a deliberate change, update it with `npx vitest run scripts/lint-rules.test.ts -u`.
import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

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

const FILES = ["src/components/ui/modal.tsx", "src/components/ui/modal.test.tsx"];

describe.each(FILES)("lint rules on for %s", (file) => {
  // The first lint starts the TypeScript project service, which takes over 10s on a cold CI
  // runner (as in boundaries.test.ts); after that each case takes about 100ms.
  beforeAll(async () => {
    await eslint.lintText("", { filePath: file });
  }, 60_000);

  it("match the snapshot", async () => {
    expect(await rulesOn(file)).toMatchSnapshot();
  });

  it.each([
    ["raw HTML", "@eslint-react/dom-no-dangerously-set-innerhtml", `export const A = ({ t }: { t: string }) => <div dangerouslySetInnerHTML={{ __html: t }} />;`],
    ["a script URL", "@eslint-react/dom-no-script-url", `export const A = () => <a href="javascript:void 0">x</a>;`],
    ["eval", "no-eval", `export const f = (t: string) => eval(t);`],
    ["new Function", "no-new-func", `export const f = (t: string) => new Function(t);`],
    ["a string timer", "@typescript-eslint/no-implied-eval", `export const f = (t: string) => setTimeout(t, 0);`],
  ])("refuse %s with %s, so typed text can't run as script (BIG-89)", async (_, rule, code) => {
    const [result] = await eslint.lintText(code, { filePath: file });
    expect(result.messages.filter((m) => m.severity === 2).map((m) => m.ruleId)).toContain(rule);
  });

  it("report each problem once: no react-hooks rule is on beside its ESLint React copy", async () => {
    const on = new Set(await rulesOn(file));
    const twice = [...on]
      .filter((name) => name.startsWith("react-hooks/"))
      .filter((name) => on.has(name.replace("react-hooks/", "@eslint-react/")));
    expect(twice).toEqual([]);
  });
});
