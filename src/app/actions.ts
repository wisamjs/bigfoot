"use server";

import { signIn, signOut } from "@/auth";

/** Sign up and sign in are the same Google OAuth flow. */
export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
