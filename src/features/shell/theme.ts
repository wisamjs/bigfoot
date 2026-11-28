/**
 * Light or dark mode (BIG-251). `data-theme` on <html> picks the tokens in globals.css. The mode a
 * job seeker chooses is kept in this browser's localStorage. With nothing saved, the page follows
 * the system setting, live.
 */
export type Theme = "light" | "dark";

export const THEME_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The mode on the page now. */
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Shows `theme` on the page and saves it, so later pages and visits open in it. */
export function chooseTheme(theme: Theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage is blocked (a private window, site data turned off): the mode lasts for this page.
  }
}

/**
 * Puts the saved mode, or the system's, back on <html>. In development React's Strict Mode remount
 * clears attributes it didn't render, including the one THEME_SCRIPT set. In production the
 * attribute is already right, so this changes nothing.
 */
export function restoreTheme() {
  applyTheme(savedTheme() ?? (matchMedia(DARK_QUERY).matches ? "dark" : "light"));
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Runs in <head> before the first paint, so a page never flashes the other mode: the saved mode,
 * else the system's, which it keeps following while nothing is saved. The same rules as above, as
 * a string, since it runs before any bundle loads.
 */
export const THEME_SCRIPT = `(function () {
  var query = matchMedia(${JSON.stringify(DARK_QUERY)});
  function saved() {
    try {
      var value = localStorage.getItem(${JSON.stringify(THEME_KEY)});
      return value === "light" || value === "dark" ? value : null;
    } catch (error) {
      return null;
    }
  }
  function apply() {
    document.documentElement.dataset.theme = saved() || (query.matches ? "dark" : "light");
  }
  apply();
  query.addEventListener("change", function () {
    if (!saved()) apply();
  });
})();`;
