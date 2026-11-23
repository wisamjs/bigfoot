"use server";

import { updateTag } from "next/cache";
import { signIn, signOut } from "@/auth";
import { applicationsTag } from "@/lib/applications";
import { findCurrentUser } from "@/lib/dal";
import { NEXT_PARAM, safeNext } from "@/lib/safe-next";

/**
 * Sign up and sign in are the same Google OAuth flow. It returns to the form's `next`, when that's
 * a path on Bigfoot, else to the dashboard.
 */
export async function signInWithGoogle(form?: FormData) {
  await signIn("google", { redirectTo: safeNext(form?.get(NEXT_PARAM)) });
}

export async function signOutAction() {
  // The next sign-in, even as the same job seeker, reads their Applications fresh.
  const user = await findCurrentUser();
  if (user) updateTag(applicationsTag(user.id));
  await signOut({ redirectTo: "/" });
}
