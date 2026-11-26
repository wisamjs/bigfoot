import type { Preview } from "@storybook/nextjs-vite";
import { sb } from "storybook/test";
import "../src/app/globals.css";
import "./preview.css";

// Server Actions run on the server, so stories use the spies in each module's __mocks__ folder
// instead, which succeed. A story that needs another answer sets it in `beforeEach`:
// `mocked(updateApplicationAction).mockResolvedValue({ ok: false, error: "…" })`.
// State a component keeps in the URL (the Interview calendar's month and day) is set with
// `parameters.nextjs.navigation.query`: Storybook's router doesn't follow history.replaceState, so
// a click that changes the URL renders nothing new. interview-calendar.stories.tsx shows how.
sb.mock(import("../src/app/actions.ts"));
sb.mock(import("../src/app/applications/actions.ts"));
sb.mock(import("../src/app/account/actions.ts"));
sb.mock(import("../src/app/journey/[id]/actions.ts"));

const preview: Preview = {
  // The same classes src/app/layout.tsx puts on <html> and <body>.
  decorators: [
    (Story) => {
      document.documentElement.classList.add("antialiased");
      document.body.classList.add("font-sans");
      return <Story />;
    },
  ],
  parameters: {
    nextjs: { appDirectory: true },
    layout: "padded",
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: {
      // Violations fail `npm run test-storybook` and CI, not only the panel.
      test: "error",
      // The same WCAG 2.2 AA and best-practice tags as scripts/a11y.mjs and src/test/setup.ts.
      options: {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa", "best-practice"],
        },
      },
      // A story is a fragment, not a page: no landmarks, <h1>, title or lang to find.
      config: {
        rules: [
          { id: "region", enabled: false },
          { id: "landmark-one-main", enabled: false },
          { id: "page-has-heading-one", enabled: false },
        ],
      },
    },
  },
  tags: ["autodocs"],
};

export default preview;
