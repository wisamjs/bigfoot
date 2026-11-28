export type Theme = "dark" | "light";

// The app's dark tokens sit in globals.css under `:root[data-theme="dark"]`, set in the app by
// src/features/shell/theme.ts. Stories follow the toolbar's Theme instead (dark unless changed),
// set here on <html>. preview.tsx runs it on every render, and snapshots.ts runs it to picture a
// page in both themes. A story that clicks the ThemeToggle changes it until the next render.
let current: Theme = "dark";

export function applyTheme(theme: Theme = current) {
  current = theme;
  document.documentElement.dataset.theme = theme;
}
