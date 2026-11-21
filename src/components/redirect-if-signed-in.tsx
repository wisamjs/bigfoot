import { Suspense } from "react";
import { redirect } from "next/navigation";
import { findCurrentUser } from "@/lib/dal";

/** Sends to /dashboard when the session is valid; a missing, expired or invalid one renders nothing. */
export async function RedirectWhenSignedIn() {
  if (await findCurrentUser()) redirect("/dashboard");
  return null;
}

/**
 * For pages a signed-in job seeker has no use for: the landing page, /sign-in and /sign-up.
 * Reads the session, so it brings its own Suspense boundary and the rest of the page stays static.
 */
export function RedirectIfSignedIn() {
  return (
    <Suspense>
      <RedirectWhenSignedIn />
    </Suspense>
  );
}
