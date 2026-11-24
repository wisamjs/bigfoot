#!/usr/bin/env node
// Every component has stories (CODING_STANDARDS.md, "Storybook shows the app as it is"): each
// .tsx in src/components/ui/ and src/features/*/ has <name>.stories.tsx beside it, or an entry
// below saying where else it is shown. Whether the stories cover a change's states is review's call.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PAGES } from "./pages.mjs";

/** Pieces drawn inside a larger component, shown through that component's stories. */
export const SHOWN_IN = {
  "src/components/ui/field-error.tsx": "src/components/ui/field.stories.tsx",
  "src/features/applications/add-form-actions.tsx": "src/features/applications/new-application-form.stories.tsx",
  "src/features/applications/application-dialogs.tsx": "src/features/applications/interview-heading.stories.tsx",
  "src/features/applications/application-row.tsx": "src/features/applications/application-list.stories.tsx",
  "src/features/applications/application-when.tsx": "src/features/applications/application-list.stories.tsx",
  "src/features/applications/details-fields.tsx": "src/features/applications/new-application-form.stories.tsx",
  "src/features/applications/details-form.tsx": "src/features/applications/application-editor.stories.tsx",
  "src/features/applications/change-status-menu.tsx": "src/features/applications/application-editor.stories.tsx",
  "src/features/applications/editable-heading.tsx": "src/features/applications/interview-heading.stories.tsx",
  "src/features/applications/date-tile.tsx": "src/features/applications/application-editor.stories.tsx",
  "src/features/applications/application-header.tsx": "src/features/applications/application-editor.stories.tsx",
  "src/features/applications/interview-list.tsx": "src/features/applications/application-editor.stories.tsx",
  "src/features/applications/interview-notes-form.tsx": "src/features/applications/interview-editor.stories.tsx",
  "src/features/applications/interview-row.tsx": "src/features/applications/application-editor.stories.tsx",
  "src/features/applications/sample-badge.tsx": "src/features/applications/application-list.stories.tsx",
  "src/features/applications/interview-progress.tsx": "src/features/applications/application-editor.stories.tsx",
  "src/features/applications/prep-look-back.tsx": "src/features/applications/interview-editor.stories.tsx",
  "src/features/applications/recently-viewed.tsx": "src/features/applications/application-not-found.stories.tsx",
  "src/features/applications/unsaved-changes.tsx": "src/features/applications/interview-editor.stories.tsx",
  "src/features/dashboard/dashboard-card.tsx": "src/features/dashboard/dashboard-applications.stories.tsx",
  "src/features/shell/account-menu.tsx": "src/features/shell/app-header.stories.tsx",
  "src/features/shell/avatar.tsx": "src/features/shell/app-header.stories.tsx",
  "src/features/shell/illustrations.tsx": "src/features/dashboard/interview-calendar.stories.tsx",
  "src/features/shell/wordmark.tsx": "src/features/shell/app-header.stories.tsx",
};

/**
 * Static page parts and page wrappers with no story: smoke and a11y open the page they're on
 * (scripts/pages.mjs). A component with states of its own belongs in SHOWN_IN or gets stories.
 */
export const ON_PAGE = {
  "src/features/applications/add-links.tsx": "/dashboard",
  "src/features/applications/deleted-notice.tsx": "/applications/[id]",
  "src/features/auth/auth-button.tsx": "/sign-in",
  "src/features/auth/auth-card.tsx": "/sign-in",
  "src/features/auth/sign-in-note.tsx": "/sign-in",
  "src/features/landing/account-deleted-notice.tsx": "/",
  "src/features/landing/features.tsx": "/",
  "src/features/landing/footer.tsx": "/",
  "src/features/landing/hero.tsx": "/",
  "src/features/landing/navbar.tsx": "/",
  "src/features/legal/legal.tsx": "/privacy",
  "src/features/shell/app-footer.tsx": "/dashboard",
  "src/features/shell/dashboard-link.tsx": "/applications/new",
  "src/features/shell/form-page.tsx": "/applications/new",
};

const ROOTS = ["src/components/ui", ...readdirSync("src/features").map((name) => join("src/features", name))];

/** The component files under the roots: .tsx files that are neither a test nor a story. */
function components(roots) {
  return roots.flatMap((root) =>
    readdirSync(root)
      .filter((name) => name.endsWith(".tsx") && !name.endsWith(".test.tsx") && !name.endsWith(".stories.tsx"))
      .map((name) => join(root, name)),
  );
}

/**
 * What's wrong, one line each: a component with no stories and no entry, and an entry whose
 * component, parent stories or page is gone.
 * @param {{ files: string[], exists: (path: string) => boolean, pages: string[],
 *   shownIn?: Record<string, string>, onPage?: Record<string, string> }} tree
 * @returns {string[]}
 */
export function storyProblems({ files, exists, pages, shownIn = SHOWN_IN, onPage = ON_PAGE }) {
  const listed = (file) => file in shownIn || file in onPage;
  return [
    ...files.map((file) => componentProblem(file, exists(file.replace(/\.tsx$/, ".stories.tsx")), listed(file))),
    ...entryProblems(shownIn, "SHOWN_IN", files, (parent) => !exists(parent) && `which doesn't exist`, "is shown in"),
    ...entryProblems(onPage, "ON_PAGE", files, (page) => !pages.includes(page) && "which scripts/pages.mjs doesn't list", "is on"),
  ].filter(Boolean);
}

/** A component with stories and an entry, or with neither. */
function componentProblem(file, hasStories, listed) {
  if (hasStories && listed) return `${file}: has stories now, so remove its entry in scripts/check-stories.mjs`;
  if (!hasStories && !listed) {
    const stories = file.replace(/^.*\//, "").replace(/\.tsx$/, ".stories.tsx");
    return `${file}: add ${stories} beside it, one story per state (CODING_STANDARDS.md, "Storybook shows the app as it is")`;
  }
  return null;
}

/** Entries whose component is gone, or whose target (parent stories, page) `missing` reports. */
function entryProblems(entries, list, files, missing, verb) {
  return Object.entries(entries).map(([file, target]) => {
    if (!files.includes(file)) return `${file}: gone, so remove its ${list} entry in scripts/check-stories.mjs`;
    const why = missing(target);
    return why ? `${file}: ${verb} ${target}, ${why}` : null;
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = storyProblems({
    files: components(ROOTS),
    exists: existsSync,
    pages: PAGES.map((page) => page.path),
  });
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    console.error(`\n${problems.length} component${problems.length === 1 ? "" : "s"} without stories.`);
    process.exit(1);
  }
  console.log("Stories: OK");
}
