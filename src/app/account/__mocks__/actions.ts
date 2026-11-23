// Storybook's stand-in for ../actions.ts (sb.mock in .storybook/preview.tsx), which runs on the
// server. Each action is a spy that succeeds; a story makes one fail with `mocked(action)`.
import { fn } from "storybook/test";
import type * as actions from "../actions";

export const createAccessTokenAction = fn<typeof actions.createAccessTokenAction>(async () => ({ error: null, created: null }));
export const revokeAccessTokenAction = fn<typeof actions.revokeAccessTokenAction>(async () => ({ ok: true }));
export const deleteAccountAction = fn<typeof actions.deleteAccountAction>(async () => ({ error: null }));
