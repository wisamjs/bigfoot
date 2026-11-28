# Signed-in pages keep the Applications read for a few minutes

Going back to the Dashboard from an Application showed the Dashboard's skeleton and read the same Applications from the API again. Both pages read them on the server with nothing keeping the result, and the browser dropped a visited page at once (`staleTimes.dynamic` defaults to 0). We decided to keep the read on the server and in the browser for a few minutes, and to expire it whenever the job seeker changes something.

- **The read.** `getApplications` in `src/lib/api.ts` is a `use cache` function keyed by the job seeker's id and tagged `applications:<id>`. It is unexported inside the module, so a caller can't pass another job seeker's id. Its `cacheLife` is `stale` 5 minutes, `revalidate` 1 minute, `expire` 1 hour. The Dashboard, the Application page, and Add Interview share it.
- **The browser.** `experimental.staleTimes.dynamic` is 5 minutes, the same as `stale`, because these pages read the session at request time and so are never reused otherwise. Back and Forward already reused them; links did not. The Application cards use `<Link prefetch>`, so the first click into an Application can be ready too.
- **Changes.** Every Server Action that changes an Application or an Interview, Sign out, and Delete account call `updateTag` on the job seeker's tag. A Server Action also clears the browser's copies.
- **Sign-in.** `onboard()` runs once per sign-in, from the Auth.js `signIn` callback, not on each Dashboard render: a POST while rendering would stop the Dashboard from being cached. If it fails, the sign-in fails and the job seeker lands on the landing page to try again.

## Why not React Query

It would add a client data layer, and the pages would stop reading their data on the server. The cache above reaches the goal with no new dependency, and it keeps the first render server-side, with the skeletons from BIG-73.

## Consequences

- A change made with an Access token (ADR 0003, such as the calendar cron) goes straight to the API and never expires the tag. It shows once the 5 minutes run out, or at the next change made in the app.
- `last_seen_at` moves with sign-ins, as its description already says, rather than with every Dashboard visit.
- A page the browser holds is up to 5 minutes old, so a second tab's changes show when this tab next changes something or the time runs out.
