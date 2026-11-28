"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { ACCOUNT_DELETED_PATH, accountTag, DELETE_CONFIRMATION } from "@/lib/account";
import * as api from "@/lib/api";
import { applicationsTag } from "@/lib/applications";
import { findCurrentUser } from "@/lib/dal";
import { accessTokenNameError, passcodeError, shareLinkLabelError } from "@/lib/validation";

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
    updateTag(accountTag(user.id));
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
  updateTag(accountTag(user.id));
  return { ok: true };
}

const SESSION_ENDED = "Your session has ended. Sign in again.";

export type CreateShareLinkState = {
  error: string | null;
  /** What's wrong with each field, shown beside it; `error` is for everything else. */
  labelError?: string | null;
  passcodeError?: string | null;
  /** The link just created, Passcode included. Held only in the page's state: reloading drops it. */
  created: api.NewShareLink | null;
};

/** Creates a Share link for the signed-in job seeker and returns its Passcode, this once. */
export async function createShareLinkAction(_: CreateShareLinkState, form: FormData): Promise<CreateShareLinkState> {
  const user = await findCurrentUser();
  if (!user) return { error: SESSION_ENDED, created: null };
  // The form checks these too, but Server Actions are plain POST endpoints.
  const label = form.get("label");
  const passcode = form.get("passcode");
  const labelError = shareLinkLabelError(label);
  const passcodeProblem = passcodeError(passcode);
  if (labelError || passcodeProblem) return { error: null, labelError, passcodeError: passcodeProblem, created: null };
  try {
    // The name Viewers see ("Wisam shared a job search with you"), from the Google account.
    const created = await api.createShareLink(user.id, String(label), String(passcode), user.name);
    updateTag(accountTag(user.id));
    return { error: null, created };
  } catch (error) {
    return { error: failure(error, "No link was created."), created: null };
  }
}

type ShareLinkResult<T> = { ok: true; link: T } | { ok: false; error: string };

/** Makes a Share link work for 7 days from now, keeping its link and Passcode. */
export async function renewShareLinkAction(id: string): Promise<ShareLinkResult<api.ShareLink>> {
  const user = await findCurrentUser();
  if (!user) return { ok: false, error: SESSION_ENDED };
  try {
    const link = await api.renewShareLink(user.id, id);
    updateTag(accountTag(user.id));
    return { ok: true, link };
  } catch (error) {
    return { ok: false, error: failure(error, "The link was not renewed.") };
  }
}

/** Sets a Share link's new Passcode, signing out its Viewers, and returns it, this once. */
export async function changePasscodeAction(id: string, passcode: string): Promise<ShareLinkResult<api.NewShareLink>> {
  const user = await findCurrentUser();
  if (!user) return { ok: false, error: SESSION_ENDED };
  const problem = passcodeError(passcode);
  if (problem) return { ok: false, error: problem };
  try {
    const link = await api.changeShareLinkPasscode(user.id, id, passcode);
    updateTag(accountTag(user.id));
    return { ok: true, link };
  } catch (error) {
    return { ok: false, error: failure(error, "The passcode was not changed.") };
  }
}

/** Stops sharing one of the signed-in job seeker's Share links: it stops working straight away. */
export async function stopSharingAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await findCurrentUser();
  if (!user) return { ok: false, error: SESSION_ENDED };
  try {
    await api.stopSharing(user.id, id);
  } catch (error) {
    // Already stopped, for example in another tab: the list just needs refreshing.
    if (!(error instanceof api.ApiError && error.status === 404)) {
      return { ok: false, error: failure(error, "The link still works.") };
    }
  }
  updateTag(accountTag(user.id));
  return { ok: true };
}

/** The API's own message, or, when it couldn't be reached, that and what didn't happen. */
function failure(error: unknown, unchanged: string) {
  if (error instanceof api.ApiError) return error.message;
  console.error(error);
  return `Couldn’t reach Bigfoot’s server. ${unchanged} Try again.`;
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
  updateTag(applicationsTag(user.id));
  updateTag(accountTag(user.id));
  await signOut({ redirectTo: ACCOUNT_DELETED_PATH });
  return { error: null };
}
