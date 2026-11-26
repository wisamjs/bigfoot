import type { Preview } from "@storybook/nextjs-vite";
import { addons } from "storybook/preview-api";
import { sb } from "storybook/test";
import { themes } from "storybook/theming";
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

type Theme = "dark" | "light";

// The app's dark tokens sit in globals.css under `@media (prefers-color-scheme: dark)`, so they
// follow the OS. Stories follow the toolbar's Theme instead (dark unless changed): its media rule
// is switched on ("all") or off ("not all") here, which keeps the token values in globals.css only.
// Runs on every render, since a CSS hot reload brings the original rule back.
const DARK_QUERY = /prefers-color-scheme:\s*dark/;
let current: Theme = "dark";
function applyTheme(theme: Theme) {
  current = theme;
  document.documentElement.style.colorScheme = theme;
  const visit = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule) {
        const element = rule as CSSMediaRule & { originalMedia?: string };
        element.originalMedia ??= rule.media.mediaText;
        if (DARK_QUERY.test(element.originalMedia)) rule.media.mediaText = theme === "dark" ? "all" : "not all";
      }
      if ("cssRules" in rule) visit((rule as CSSGroupingRule).cssRules);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      visit(sheet.cssRules);
    } catch {
      // A cross-origin sheet can't be read, and holds no tokens.
    }
  }
}

// Pages with no stories (tokens.mdx) run no decorator: start dark, apply again once linked sheets
// (a built Storybook's CSS) have loaded, and follow the toolbar from the preview channel.
applyTheme(current);
window.addEventListener("load", () => applyTheme(current), { once: true });
addons.getChannel().on("globalsUpdated", ({ globals }: { globals: Record<string, unknown> }) =>
  applyTheme(globals.theme === "light" ? "light" : "dark"),
);

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Light or dark tokens",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "dark", title: "Dark", icon: "moon" },
          { value: "light", title: "Light", icon: "sun" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "dark" },
  // The same classes src/app/layout.tsx puts on <html> and <body>.
  decorators: [
    (Story, context) => {
      applyTheme(context.globals.theme === "light" ? "light" : "dark");
      document.documentElement.classList.add("antialiased");
      document.body.classList.add("font-sans");
      return <Story />;
    },
  ],
  parameters: {
    docs: { theme: themes.dark },
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
