"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type PrefetchOptions = NonNullable<Parameters<ReturnType<typeof useRouter>["prefetch"]>[1]>;

// The whole page, the data its URL picks included, as `<Link prefetch>` fetches it. The default
// ("auto") fetches only what every page of the route shares, so an Interview page would still show
// its skeleton. Next.js types `kind` with an enum it doesn't export; "full" is that enum's value.
const FULL = "full" as PrefetchOptions["kind"];

/**
 * Prefetches each of `hrefs`, in order, once the page is in the browser, and again whenever Next.js
 * says a prefetch went stale (a Server Action that expires its data, BIG-205), so the next click
 * shows the page at once. Draws nothing. A `<Link>` prefetches only once it scrolls into view, in
 * the order links appear; this is for pages that should be ready whether or not their link is on
 * screen, in an order of our choosing.
 */
export function PrefetchRoutes({ hrefs }: { hrefs: readonly string[] }) {
  const router = useRouter();
  // The list arrives anew with every render of the page; prefetch again only when it changes.
  const key = hrefs.join("\n");
  useEffect(() => {
    let cancelled = false;
    // Next.js fetches the newest prefetch first, so the last page is asked for first and the first
    // page last, and the first page is the first to arrive.
    for (const href of key.split("\n").filter(Boolean).toReversed()) {
      const prefetch = () => {
        if (!cancelled) router.prefetch(href, { kind: FULL, onInvalidate: prefetch });
      };
      prefetch();
    }
    return () => {
      cancelled = true;
    };
  }, [router, key]);
  return null;
}
