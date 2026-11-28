# Signed-in pages are prefetched whole

Extends ADR 0006.

ADR 0006 kept the Applications read for a few minutes, but measured in a production build with 200 ms of latency, opening an Interview from its Application, moving to the next Round, and going back to the Application after a notes save each still showed the page's skeleton for a round trip, and Account showed its skeleton on every first visit. Every Interview was already in the kept read; the prefetches just never carried it. We decided to prefetch the signed-in pages whole, from the Next.js cache we already have (BIG-205).

- **Prefetches carry the page.** Three things stopped them. `getCurrentUser` called `connection()`, which marks everything under it as request-time, and no prefetch includes request-time content. It now reads the session in a `"use cache: private"` function with a 5-minute `stale`: the result stays in the browser, never in a server cache. `getApplications` and the other kept reads named the job seeker to Sentry by awaiting a SHA-256 first, async work a prefetch stops at; that hash is now kept (`use cache`, `cacheLife("max")`), as it never changes for an id. And the default prefetch (`"auto"`) fetches only what every page of a route shares, never the content its URL picks, so the Interview page's own data never came.
- **What is prefetched, in what order.** `PrefetchRoutes` (`src/features/shell/prefetch-routes.tsx`) calls `router.prefetch` with `kind: "full"` for a list of pages, in order, and again whenever Next.js says one went stale, as after a Server Action that expires the Applications tag. The Application page lists its Interview pages from the latest Round back to Round 1; an Interview page lists the others in the same order, then its Application page. The Account menu lists Account, whose one link is inside the closed menu, so a `<Link>` never prefetched it.
- **Account's reads are kept.** The Account page counts Applications through `getApplications`, and reads Access tokens and Share links through `getAccessTokens` and `getShareLinks`, kept like the Applications and tagged `account:<id>`. The Account Server Actions, signing out, and deleting the account expire that tag with `updateTag`, which also re-renders the page, in place of `refresh()`.

## Why not React Query

Considered in BIG-205 and set aside: it would move page rendering and the cross-Application logic (takeaways, They asked last time) to the browser, send every Application's data, salary and notes included, to every page, and add a second cache to keep in step with this one. The Next.js cache met every criterion without it. A client data layer comes back only when a need appears that this cache can't meet, with its own ADR.

## Consequences

- Opening an Application with 8 Interviews makes 8 prefetch requests, and an Interview page 8 (7 Rounds and the Application); each renders the page on the server from the kept reads, with no call to the API. Every save on one of those pages expires them, so they are fetched again in the background: about one server render per Interview per save, never a call to the API.
- A row of the Dashboard's Applications list still prefetches only once it scrolls into view (ADR 0006), so the first click on a row below the fold waits one round trip, without a skeleton.
- The browser keeps who is signed in for up to 5 minutes. Signing out and deleting the account are Server Actions, which clear the browser's copies, as before.
- A token's last use and a Share link's last opening, which scripts and Viewers change through the API, show on Account once the 5 minutes run out or at the job seeker's next change there, as Access-token changes to Applications already do (ADR 0006).
