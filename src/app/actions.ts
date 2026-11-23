"use server";

import { updateTag } from "next/cache";
import { signIn, signOut } from "@/auth";
import { applicationsTag } from "@/lib/applications";
import { findCurrentUser } from "@/lib/dal";

/** Sign up and sign in are the same Google OAuth flow. */
export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function signOutAction() {
  // The next sign-in, even as the same job seeker, reads their Applications fresh.
  const user = await findCurrentUser();
  if (user) updateTag(applicationsTag(user.id));
  await signOut({ redirectTo: "/" });
}
