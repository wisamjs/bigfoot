import "server-only";
import * as api from "@/lib/api";
import { SHARE_LINK_ID_PATTERN, type Journey } from "@/lib/journey";
import { shareLinkPath } from "@/lib/share-links";

// A Viewer of a Share link (GLOSSARY.md, docs/adr/0008): their cookie, and which page `/journey/[id]`
// shows them. Every load asks the API again, so a stopped or expired link, or one with a new
// Passcode, sends the Viewer to the right page straight away.

/** The Viewer's cookie for one Share link: the Viewer token, scoped to that link's path. */
export const VIEWER_COOKIE = "bigfoot_viewer";

/** The cookie the right Passcode sets: HttpOnly, Secure, SameSite=Lax, only for `/journey/<id>`, until the link expires. */
export function viewerCookie(id: string, token: string, expiresAt: string) {
  return {
    name: VIEWER_COOKIE,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: shareLinkPath(id),
    expires: new Date(expiresAt),
  };
}

export type SharedPage =
  | { kind: "journey"; journey: Journey }
  | { kind: "passcode"; sharedBy: string | null; locked: boolean }
  | { kind: "expired"; sharedBy: string | null }
  | { kind: "not_active" };

/**
 * Which page `/journey/<id>` shows: the Journey when the Viewer's token still opens it, otherwise what
 * the link's status says. A stopped link and an unknown id look the same, and name nobody.
 */
export async function sharedPage(id: string, viewerToken: string | undefined): Promise<SharedPage> {
  if (!SHARE_LINK_ID_PATTERN.test(id)) return { kind: "not_active" };
  if (viewerToken) {
    try {
      return { kind: "journey", journey: await api.getJourney(id, viewerToken) };
    } catch (error) {
      // 401: the Passcode changed or the token is no good, so the Viewer types the Passcode again.
      if (!(error instanceof api.ApiError && [401, 404, 410].includes(error.status))) throw error;
    }
  }
  const status = await api.getShareLinkStatus(id);
  if (!status) return { kind: "not_active" };
  if (status.expired) return { kind: "expired", sharedBy: status.shared_by };
  return { kind: "passcode", sharedBy: status.shared_by, locked: status.locked };
}
