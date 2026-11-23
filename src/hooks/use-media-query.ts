"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a CSS media query matches, kept up to date as the window changes. False on the server
 * and before hydration, so render what's right for a small screen first, or only use it for
 * something that isn't on screen until asked for, such as a menu's items.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
