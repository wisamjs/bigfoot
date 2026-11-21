import type { Session } from "next-auth";

export type CurrentUser = {
  /** Job seeker id: scopes every Application to this job seeker. */
  id: string;
  name: string;
  firstName: string;
  email: string;
  image: string | null;
};

/**
 * The job seeker a session belongs to, or null when it doesn't name one. The one rule for
 * "signed in": the Data Access Layer and src/proxy.ts both use it, so the proxy never sends
 * someone to /dashboard that the dashboard would send back.
 */
export function toCurrentUser(session: Session | null): CurrentUser | null {
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
