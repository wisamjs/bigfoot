// A stand-in for next/navigation in component tests: `vi.mock("next/navigation", () => import("@/test/navigation"))`.
// useSearchParams follows window.location as Next.js's does, including the window.history.replaceState
// calls it integrates into the router, so a component that keeps its view in the URL re-renders.
import { useSyncExternalStore } from "react";
import { vi } from "vitest";

const listeners = new Set<() => void>();
const replaceState = window.history.replaceState.bind(window.history);
window.history.replaceState = (...args: Parameters<History["replaceState"]>) => {
  replaceState(...args);
  for (const listener of listeners) listener();
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSearchParams() {
  const search = useSyncExternalStore(subscribe, () => window.location.search);
  return new URLSearchParams(search);
}

// eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- it stands in for next/navigation's useRouter, so it keeps that name.
export const useRouter = () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() });
