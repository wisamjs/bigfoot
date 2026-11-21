"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { ACCOUNT_DELETED_PATH, DELETE_CONFIRMATION } from "@/lib/account";
import * as api from "@/lib/api";
import { findCurrentUser } from "@/lib/dal";
import { accessTokenNameError } from "@/lib/validation";

export type CreateAccessTokenState = {
  error: string | null;
  /** What's wrong with the name, shown beside the field; `error` is for everything else. */
  nameError?: string | null;
  /** The token just created, secret included. Held only in the page's state: reloading drops it. */
  created: api.NewAccessToken | null;
};

/** Creates an Access token for the signed-in job seeker and returns its secret, this once. */
export async function createAccessTokenAction(
  _: CreateAccessTokenState,
  form: FormData,
): Promise<CreateAccessTokenState> {
  const user = await findCurrentUser();
  if (!user) return { error: "Your session has ended. Sign in again.", created: null };
  // The form checks the name too, but Server Actions are plain POST endpoints.
  const name = form.get("name");
  const nameError = accessTokenNameError(name);
  if (nameError) return { error: null, nameError, created: null };
  try {
    const created = await api.createAccessToken(user.id, String(name));
    refresh();
    return { error: null, created };
  } catch (error) {
    if (error instanceof api.ApiError) return { error: error.message, created: null };
    console.error(error);
    return { error: "Couldn’t reach Bigfoot’s server. No token was created. Try again.", created: null };
  }
}

/** Revokes one of the signed-in job seeker's Access tokens: it stops working straight away. */
export async function revokeAccessTokenAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await findCurrentUser();
  if (!user) return { ok: false, error: "Your session has ended. Sign in again." };
  try {
    await api.revokeAccessToken(user.id, id);
  } catch (error) {
    // Already revoked, for example in another tab: the list just needs refreshing.
    if (!(error instanceof api.ApiError && error.status === 404)) {
      if (error instanceof api.ApiError) return { ok: false, error: error.message };
      console.error(error);
      return { ok: false, error: "Couldn’t reach Bigfoot’s server. The token was not revoked. Try again." };
    }
  }
  refresh();
  return { ok: true };
}

export type DeleteAccountState = { error: string | null };

/** Deletes the signed-in job seeker and all of their Applications, then signs them out. */
export async function deleteAccountAction(_: DeleteAccountState, form: FormData): Promise<DeleteAccountState> {
  const user = await findCurrentUser();
  if (!user) redirect("/");
  // The form checks this too, but Server Actions are plain POST endpoints.
  if (String(form.get("confirmation") ?? "").trim() !== DELETE_CONFIRMATION) {
    return { error: `Type ${DELETE_CONFIRMATION} to confirm.` };
  }
  try {
    await api.deleteAccount(user.id);
  } catch (error) {
    if (error instanceof api.ApiError) return { error: error.message };
    console.error(error);
    return { error: "Couldn’t reach Bigfoot’s server. Nothing was deleted. Try again." };
  }
  await signOut({ redirectTo: ACCOUNT_DELETED_PATH });
  return { error: null };
}
