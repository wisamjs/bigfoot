/** Where sign-in goes when there is no `next`, or one that isn't safe to follow. */
export const DEFAULT_NEXT = "/dashboard";

/** The search param that says where to go once signed in, a path with its search, URL-encoded. */
export const NEXT_PARAM = "next";

// Any origin will do: a path that stays on it is a path on Bigfoot.
const PROBE = "https://bigfoot.invalid";

/**
 * `value` when it is a path on Bigfoot (`/dashboard`, `/applications/1?x=2`), else `/dashboard`.
 * Refuses absolute URLs, protocol-relative ones (`//evil.example`) and backslashes, which some
 * browsers read as slashes (`/\evil.example`), so `next` can't send a job seeker to another site.
 */
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return DEFAULT_NEXT;
  }
  try {
    const url = new URL(value, PROBE);
    if (url.origin !== PROBE) return DEFAULT_NEXT;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_NEXT;
  }
}

/** The sign-in page, sending the job seeker on to `path` (a path with its search) once signed in. */
export function signInHref(path: string): string {
  return `/sign-in?${new URLSearchParams({ [NEXT_PARAM]: path })}`;
}
