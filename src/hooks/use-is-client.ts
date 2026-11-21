"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** True after hydration. Dates depend on the viewer's time zone, which the server doesn't know. */
export function useIsClient() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
