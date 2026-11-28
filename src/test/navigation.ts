// A stand-in for next/navigation in component tests: `vi.mock("next/navigation", () => import("@/test/navigation"))`.
// useSearchParams follows window.location as Next.js's does, including the window.history.pushState
// and replaceState calls it integrates into the router, and Back and Forward (popstate), so a
// component that keeps its view in the URL re-renders.
import { useSyncExternalStore } from "react";
import { vi } from "vitest";

const listeners = new Set<() => void>();
const notify = () => {
  for (const listener of listeners) listener();
};
for (const method of ["pushState", "replaceState"] as const) {
  const original = window.history[method].bind(window.history);
  window.history[method] = (...args: Parameters<History["pushState"]>) => {
    original(...args);
    notify();
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

export function useSearchParams() {
  const search = useSyncExternalStore(subscribe, () => window.location.search);
  return new URLSearchParams(search);
}

// eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- it stands in for next/navigation's useRouter, so it keeps that name.
export const useRouter = () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() });
