import "server-only";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type CurrentUser = {
  /** Owner id for the job seeker's Applications. */
  id: string;
  name: string;
  firstName: string;
  email: string;
  image: string | null;
};

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
  const session = await auth();
  const user = session?.user;
  if (!user?.email || !user.id) return null;

  const name = user.name ?? user.email;
  return {
    id: user.id,
    name,
    firstName: name.split(" ")[0],
    email: user.email,
    image: user.image ?? null,
  };
}
