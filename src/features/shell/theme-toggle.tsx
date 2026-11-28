"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { chooseTheme, currentTheme } from "./theme";

/** Calls `onChange` whenever the mode on <html> changes: this toggle, another one, or the system. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/**
 * The header's light and dark mode switch (BIG-251): a moon in light mode, a sun in dark mode, and
 * pressed while dark. The icon follows `data-theme` through CSS, so it is right from the first
 * paint, before React knows the mode.
 */
export function ThemeToggle() {
  // The server can't know the mode, so it renders the button unpressed until hydration.
  const dark = useSyncExternalStore(subscribe, () => currentTheme() === "dark", () => false);

  return (
    <Button
      variant="tertiary"
      aria-label="Dark mode"
      aria-pressed={dark}
      className="touch-target shrink-0 px-2.5"
      onClick={() => chooseTheme(currentTheme() === "dark" ? "light" : "dark")}
    >
      <Moon className="size-4 dark:hidden" aria-hidden />
      <Sun className="hidden size-4 dark:block" aria-hidden />
    </Button>
  );
}
