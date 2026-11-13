"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { ACCOUNT_DELETED_PATH, DELETE_CONFIRMATION } from "@/lib/account";
import * as api from "@/lib/api";
import { findCurrentUser } from "@/lib/dal";

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
