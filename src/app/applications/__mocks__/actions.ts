// Storybook's stand-in for ../actions.ts (sb.mock in .storybook/preview.tsx), which runs on the
// server. Each action is a spy that succeeds; a story makes one fail with `mocked(action)`.
import { fn } from "storybook/test";
import type * as actions from "../actions";

export const createApplicationAction = fn<typeof actions.createApplicationAction>(async () => ({ ok: true, id: "new" }));
export const updateApplicationAction = fn<typeof actions.updateApplicationAction>(async () => ({ ok: true }));
// The real one redirects to the dashboard instead of returning, so the caller never hears back.
export const deleteApplicationAction = fn<typeof actions.deleteApplicationAction>(() => new Promise(() => {}));
export const createInterviewAction = fn<typeof actions.createInterviewAction>(async () => ({ ok: true }));
export const updateInterviewAction = fn<typeof actions.updateInterviewAction>(async () => ({ ok: true }));
export const deleteInterviewAction = fn<typeof actions.deleteInterviewAction>(async () => ({ ok: true }));
