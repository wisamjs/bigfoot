import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { storyProblems } from "./check-stories.mjs";

const UI = "src/components/ui/badge.tsx";
const ROW = "src/features/applications/application-row.tsx";
const HERO = "src/features/landing/hero.tsx";
const LIST_STORIES = "src/features/applications/application-list.stories.tsx";

/** A tree holding `files` and the stories files in `stories`, with the pages "/" and "/dashboard". */
function check(files: string[], stories: string[], entries: { shownIn?: Record<string, string>; onPage?: Record<string, string> } = {}) {
  return storyProblems({
    files,
    exists: (path: string) => stories.includes(path),
    pages: ["/", "/dashboard"],
    shownIn: entries.shownIn ?? {},
    onPage: entries.onPage ?? {},
  });
}

describe("storyProblems", () => {
  it("passes a component with stories beside it", () => {
    expect(check([UI], ["src/components/ui/badge.stories.tsx"])).toEqual([]);
  });

  it("names a component with no stories and no entry", () => {
    expect(check([UI], [])).toEqual([expect.stringMatching(/^src\/components\/ui\/badge\.tsx: add badge\.stories\.tsx beside it/)]);
  });

  it("passes a piece shown through its parent's stories, and a static part on a checked page", () => {
    expect(check([ROW, HERO], [LIST_STORIES], { shownIn: { [ROW]: LIST_STORIES }, onPage: { [HERO]: "/" } })).toEqual([]);
  });

  it("fails an entry whose component is gone, so the lists stay current", () => {
    expect(check([], [LIST_STORIES], { shownIn: { [ROW]: LIST_STORIES }, onPage: { [HERO]: "/" } })).toEqual([
      expect.stringContaining(`${ROW}: gone`),
      expect.stringContaining(`${HERO}: gone`),
    ]);
  });

  it("fails an entry whose parent stories or page doesn't exist", () => {
    expect(check([ROW, HERO], [], { shownIn: { [ROW]: LIST_STORIES }, onPage: { [HERO]: "/welcome" } })).toEqual([
      `${ROW}: is shown in ${LIST_STORIES}, which doesn't exist`,
      `${HERO}: is on /welcome, which scripts/pages.mjs doesn't list`,
    ]);
  });

  it("fails an entry for a component that has its own stories now", () => {
    expect(check([ROW], ["src/features/applications/application-row.stories.tsx", LIST_STORIES], { shownIn: { [ROW]: LIST_STORIES } })).toEqual([
      expect.stringContaining(`${ROW}: has stories now`),
    ]);
  });

  it("passes on the current tree", () => {
    expect(execFileSync("node", ["scripts/check-stories.mjs"], { encoding: "utf8" })).toContain("Stories: OK");
  });
});
