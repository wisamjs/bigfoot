export type Theme = "dark" | "light";

// The app's dark tokens sit in globals.css under `@media (prefers-color-scheme: dark)`, so they
// follow the OS. Stories follow the toolbar's Theme instead (dark unless changed): its media rule
// is switched on ("all") or off ("not all") here, which keeps the token values in globals.css only.
// preview.tsx runs it on every render, since a CSS hot reload brings the original rule back, and
// snapshots.ts runs it to picture a page in both themes.
const DARK_QUERY = /prefers-color-scheme:\s*dark/;
let current: Theme = "dark";

export function applyTheme(theme: Theme = current) {
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
