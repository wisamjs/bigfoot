import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_KEY, THEME_SCRIPT, restoreTheme } from "./theme";
import { ThemeToggle } from "./theme-toggle";

const html = document.documentElement;

/**
 * Storage that throws, as in a private window or with site data turned off. It replaces the global
 * rather than spying on localStorage: happy-dom's Storage is a Proxy that a spy outlives, which left
 * storage blocked for every later test.
 */
function blockStorage() {
  const blocked = () => {
    throw new Error("blocked");
  };
  vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked });
}

/** A system colour scheme the tests can change, with the listeners matchMedia gave out. */
function systemScheme(dark: boolean) {
  const listeners = new Set<() => void>();
  const list = {
    get matches() {
      return dark;
    },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  };
  vi.spyOn(window, "matchMedia").mockReturnValue(list as unknown as MediaQueryList);
  return {
    change(next: boolean) {
      dark = next;
      listeners.forEach((listener) => listener());
    },
  };
}

/** Runs the <head> script, as the browser does before the first paint. */
function runThemeScript() {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func -- the browser runs THEME_SCRIPT as a string; the test runs that same string.
  new Function(THEME_SCRIPT)();
}

beforeEach(() => {
  delete html.dataset.theme;
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("the theme script", () => {
  it("follows the system setting while nothing is saved, live", () => {
    const system = systemScheme(true);
    runThemeScript();
    expect(html.dataset.theme).toBe("dark");
    system.change(false);
    expect(html.dataset.theme).toBe("light");
  });

  it("opens in the saved mode, and keeps it when the system setting changes", () => {
    localStorage.setItem(THEME_KEY, "light");
    const system = systemScheme(true);
    runThemeScript();
    expect(html.dataset.theme).toBe("light");
    system.change(false);
    system.change(true);
    expect(html.dataset.theme).toBe("light");
  });

  it("ignores a saved value that isn't a mode", () => {
    localStorage.setItem(THEME_KEY, "sepia");
    systemScheme(true);
    runThemeScript();
    expect(html.dataset.theme).toBe("dark");
  });

  it("follows the system when storage is blocked", () => {
    localStorage.setItem(THEME_KEY, "light");
    blockStorage();
    systemScheme(true);
    runThemeScript();
    expect(html.dataset.theme).toBe("dark");
  });
});

describe("restoreTheme", () => {
  it("puts the saved mode back after React clears it", () => {
    localStorage.setItem(THEME_KEY, "dark");
    systemScheme(false);
    restoreTheme();
    expect(html.dataset.theme).toBe("dark");
  });
});

describe("ThemeToggle", () => {
  it("switches the page to dark and back, and saves each choice", async () => {
    const user = userEvent.setup();
    html.dataset.theme = "light";
    render(<ThemeToggle />);
    const toggle = screen.getByRole("button", { name: "Dark mode" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);
    expect(html.dataset.theme).toBe("dark");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");

    await user.click(toggle);
    expect(html.dataset.theme).toBe("light");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
  });

  it("follows a change it didn't make, such as the system setting or another toggle", async () => {
    html.dataset.theme = "light";
    render(<ThemeToggle />);
    await act(async () => {
      html.dataset.theme = "dark";
    });
    expect(screen.getByRole("button", { name: "Dark mode" })).toHaveAttribute("aria-pressed", "true");
  });

  it("still switches the page when storage is blocked", async () => {
    const user = userEvent.setup();
    blockStorage();
    html.dataset.theme = "light";
    render(<ThemeToggle />);
    await user.click(screen.getByRole("button", { name: "Dark mode" }));
    expect(html.dataset.theme).toBe("dark");
  });
});
