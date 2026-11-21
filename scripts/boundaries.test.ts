// The import boundaries in eslint.config.mjs (CODING_STANDARDS.md, "Where code goes") still bite:
// each case lints one import as if it were the whole of a real file in the folder under test, and
// checks whether boundaries/dependencies reports it. Without this, a config typo could quietly
// allow everything.
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

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
};

async function blocked(from: string, source: string) {
  const [result] = await eslint.lintText(`import * as probe from "${source}";\nexport { probe };\n`, { filePath: from });
  expect(result.messages.filter((message) => message.fatal)).toEqual([]);
  return result.messages.some((message) => message.ruleId === "boundaries/dependencies");
}

describe("import boundaries", () => {
  it.each([
    [IN.ui, "@/lib/applications"],
    [IN.ui, "@/features/auth/auth-card"],
    [IN.ui, "@/app/actions"],
    [IN.lib, "@/components/ui/badge"],
    [IN.auth, "@/features/landing/hero"],
    [IN.applications, "@/features/dashboard/coming-up-calendar"],
    [IN.auth, "@/app/page"],
    [IN.auth, "@/test/applications"],
  ])("stop %s importing %s", async (from, source) => {
    expect(await blocked(from, source)).toBe(true);
  });

  it.each([
    [IN.ui, "@/components/ui/button"],
    [IN.ui, "@/hooks/use-is-client"],
    [IN.auth, "@/components/ui/container"],
    [IN.auth, "@/app/actions"],
    [IN.dashboard, "@/features/applications/pipeline-board"],
    [IN.landing, "@/features/auth/sign-in-note"],
    [IN.shell, "@/features/auth/auth-button"],
    [IN.app, "@/features/dashboard/dashboard-pipeline"],
    [IN.authTest, "@/test/applications"],
  ])("let %s import %s", async (from, source) => {
    expect(await blocked(from, source)).toBe(false);
  });
});
