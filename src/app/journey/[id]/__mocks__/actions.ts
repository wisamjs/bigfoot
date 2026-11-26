// Storybook's stand-in for ../actions.ts (sb.mock in .storybook/preview.tsx), which runs on the
// server. Opening a Share link answers "wrong" until a story says otherwise; Lock does nothing.
import { fn } from "storybook/test";
import type * as actions from "../actions";

export const openJourneyAction = fn<typeof actions.openJourneyAction>(async () => ({ status: "wrong" }));
export const lockAction = fn<typeof actions.lockAction>(async () => {});
