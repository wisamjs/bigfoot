// Storybook's stand-in for ../actions.ts (sb.mock in .storybook/preview.tsx), which runs on the
// server. Each action is a spy that succeeds; a story makes one fail with `mocked(action)`.
import { fn } from "storybook/test";
import type * as actions from "../actions";

export const createAccessTokenAction = fn<typeof actions.createAccessTokenAction>(async () => ({ error: null, created: null }));
export const revokeAccessTokenAction = fn<typeof actions.revokeAccessTokenAction>(async () => ({ ok: true }));
export const createShareLinkAction = fn<typeof actions.createShareLinkAction>(async () => ({ error: null, created: null }));
export const renewShareLinkAction = fn<typeof actions.renewShareLinkAction>(async (id) => ({
  ok: true,
  link: {
    id,
    label: "Mom & Dad",
    created_at: "2026-11-20T15:00:00Z",
    passcode_set_at: "2026-11-20T15:00:00Z",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    last_opened_at: null,
    expired: false,
  },
}));
export const changePasscodeAction = fn<typeof actions.changePasscodeAction>(async (id, passcode) => ({
  ok: true,
  link: {
    id,
    label: "Mom & Dad",
    created_at: "2026-11-20T15:00:00Z",
    passcode_set_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    last_opened_at: null,
    expired: false,
    passcode,
  },
}));
export const stopSharingAction = fn<typeof actions.stopSharingAction>(async () => ({ ok: true }));
export const deleteAccountAction = fn<typeof actions.deleteAccountAction>(async () => ({ error: null }));
