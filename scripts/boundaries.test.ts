// The import boundaries in eslint.config.mjs (CODING_STANDARDS.md, "Where code goes") still bite:
// each case lints one import as if it were the whole of a real file in the folder under test, and
// checks whether boundaries/dependencies reports it. Without this, a config typo could quietly
// allow everything.
import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

const eslint = new ESLint();

// Real files, so the TypeScript project service can parse them; only their text is replaced.
const IN = {
  ui: "src/components/ui/badge.tsx",
  lib: "src/lib/calendar.ts",
  app: "src/app/page.tsx",
  applications: "src/features/applications/status-tone.ts",
  auth: "src/features/auth/auth-card.tsx",
  dashboard: "src/features/dashboard/next-interview-stat.tsx",
  landing: "src/features/landing/hero.tsx",
  shell: "src/features/shell/app-footer.tsx",
  authTest: "src/features/auth/auth-card.test.tsx",
  applicationsStory: "src/features/applications/application-list.stories.tsx",
  server: "src/proxy.ts",
};

async function blocked(from: string, source: string) {
  const [result] = await eslint.lintText(`import * as probe from "${source}";\nexport { probe };\n`, { filePath: from });
  expect(result.messages.filter((message) => message.fatal)).toEqual([]);
  return result.messages.some((message) => message.ruleId === "boundaries/dependencies");
}

describe("import boundaries", () => {
  // The first lint starts the TypeScript project service, which takes over 10s on a cold CI
  // runner; after that each case takes about 100ms.
  beforeAll(async () => {
    await eslint.lintText("", { filePath: IN.ui });
  }, 60_000);

  it.each([
    [IN.ui, "@/lib/applications"],
    [IN.ui, "@/features/auth/auth-card"],
    [IN.ui, "@/app/actions"],
    [IN.lib, "@/components/ui/badge"],
    [IN.auth, "@/features/landing/hero"],
    [IN.applications, "@/features/dashboard/interview-calendar"],
    [IN.auth, "@/app/page"],
    [IN.auth, "@/test/applications"],
    [IN.applicationsStory, "@/features/dashboard/interview-calendar"],
    [IN.ui, "@/auth"],
    [IN.auth, "@/auth"],
  ])("stop %s importing %s", async (from, source) => {
    expect(await blocked(from, source)).toBe(true);
  });

  it.each([
    [IN.ui, "@/components/ui/button"],
    [IN.ui, "@/hooks/use-is-client"],
    [IN.auth, "@/components/ui/container"],
    [IN.auth, "@/app/actions"],
    [IN.dashboard, "@/features/applications/application-list"],
    [IN.landing, "@/features/auth/sign-in-note"],
    [IN.shell, "@/features/auth/auth-button"],
    [IN.app, "@/features/dashboard/dashboard-applications"],
    [IN.authTest, "@/test/applications"],
    [IN.applicationsStory, "@/test/applications"],
    [IN.lib, "@/auth"],
    [IN.app, "@/auth"],
    [IN.server, "@/lib/session"],
  ])("let %s import %s", async (from, source) => {
    expect(await blocked(from, source)).toBe(false);
  });

  it("flag a file in src that belongs to no element, such as a new top-level folder", async () => {
    // The file doesn't exist, so the TypeScript project service can't parse it; this rule needs
    // no types, so lint it without them, and without the one rule that refuses to run untyped.
    const untyped = new ESLint({
      overrideConfig: {
        languageOptions: { parserOptions: { projectService: false } },
        rules: { "@typescript-eslint/no-implied-eval": "off" },
      },
    });
    const [result] = await untyped.lintText("export const x = 1;\n", { filePath: "src/utils/probe.ts" });
    expect(result.messages.filter((message) => message.fatal)).toEqual([]);
    expect(result.messages.map((message) => message.ruleId)).toContain("boundaries/no-unknown-files");
  });
});
