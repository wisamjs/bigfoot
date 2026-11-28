import "server-only";
import { cacheLife } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { toCurrentUser, type CurrentUser } from "@/lib/current-user";

export type { CurrentUser };

/**
 * Data Access Layer: the single place that reads the session.
 * Reads request cookies, so callers must render inside a <Suspense> boundary.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const user = await findCurrentUser();
  if (!user) redirect("/");
  return user;
}

/** Like getCurrentUser, but returns null instead of redirecting (for Server Actions). */
export async function findCurrentUser(): Promise<CurrentUser | null> {
  // Private: the result stays in this browser, never in a server cache. With a lifetime, a prefetch
  // can carry the pages that read the session, which connection() kept out of every prefetch, so
  // they show at once (BIG-205). 5 minutes, as long as the reads below it (docs/adr/0006). A
  // private scope runs at request time, so Auth.js's crypto.getRandomValues() never meets prerender.
  "use cache: private";
  cacheLife({ stale: 300 });
  return toCurrentUser(await auth());
}
