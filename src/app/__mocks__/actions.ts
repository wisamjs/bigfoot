// Storybook's stand-in for ../actions.ts (sb.mock in .storybook/preview.tsx), which runs on the
// server: signing in and out do nothing.
import { fn } from "storybook/test";
import type * as actions from "../actions";

export const signInWithGoogle = fn<typeof actions.signInWithGoogle>(async () => {});
export const signOutAction = fn<typeof actions.signOutAction>(async () => {});
