"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import * as api from "@/lib/api";
import { SHARE_LINK_ID_PATTERN } from "@/lib/journey";
import { shareLinkPath } from "@/lib/share-links";
import { VIEWER_COOKIE, viewerCookie } from "@/lib/viewer";

/** The Passcode form's result: nothing yet, a wrong Passcode, the link locked, or the server unreachable. */
export type PasscodeState = { status: "idle" | "wrong" | "locked" | "error" };

/**
 * Checks a Viewer's Passcode for Share link `id`. The right one sets the Viewer's cookie and
 * reloads the page, which then shows the Journey; so does a link that stopped or expired meanwhile,
 * which then shows why. A wrong one counts against the link's 5 tries.
 */
export async function openJourneyAction(id: string, _: PasscodeState, form: FormData): Promise<PasscodeState> {
  if (!SHARE_LINK_ID_PATTERN.test(id)) redirect("/");
  const passcode = String(form.get("passcode") ?? "");
  if (!passcode) return { status: "wrong" };
  let opened: { token: string; expires_at: string };
  try {
    opened = await api.openShareLink(id, passcode);
  } catch (error) {
    if (!(error instanceof api.ApiError)) {
      console.error(error);
      return { status: "error" };
    }
    if (error.status === 401 || error.status === 422) return { status: "wrong" };
    if (error.status === 423) return { status: "locked" };
    // Stopped (404) or expired (410) since the page loaded: the page says which.
    redirect(shareLinkPath(id));
  }
  (await cookies()).set(viewerCookie(id, opened.token, opened.expires_at));
  redirect(shareLinkPath(id));
}

/** Lock: forgets the Viewer's cookie for Share link `id`, back to the Passcode page. */
export async function lockAction(id: string) {
  if (!SHARE_LINK_ID_PATTERN.test(id)) redirect("/");
  (await cookies()).delete({ name: VIEWER_COOKIE, path: shareLinkPath(id) });
  redirect(shareLinkPath(id));
}
