"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
    for (const href of key.split("\n").filter(Boolean)) {
      const prefetch = () => {
        // The type asks for a `kind`, which Next.js doesn't export; left out, as in the docs'
        // example, it is "auto", the same prefetch a <Link> makes.
        if (!cancelled) router.prefetch(href, { onInvalidate: prefetch } as Parameters<typeof router.prefetch>[1]);
      };
      prefetch();
    }
    return () => {
      cancelled = true;
    };
  }, [router, key]);
  return null;
}
