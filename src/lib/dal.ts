import "server-only";
import { connection } from "next/server";
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
  // Auth.js touches crypto.getRandomValues() before reading the request, which
  // Cache Components rejects during prerender. Opt into request time first.
  await connection();
  return toCurrentUser(await auth());
}
