"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** What a save reports back: done, or why not. */
export type SaveResult = { ok: true } | { ok: false; error: string };

/** Where one field's or form's save is: nothing to show, saving, just saved, or failed. */
export type SaveStatus =
  | { phase: "idle" }
  | { phase: "saving" }
  /** `run` counts saves, so a second "Saved" restarts its fade instead of continuing the first. */
  | { phase: "saved"; run: number }
  | { phase: "failed"; error: string };

/** How long "Saved" stays before it goes back to nothing. SaveStatus fades it out over the end. */
export const SAVED_FOR_MS = 2000;

/** Shown when a save throws instead of reporting an error, e.g. when the network is down. */
export const SAVE_THREW = "Couldn’t save. Check your connection and try again.";

/**
 * The save status of one field or form, for SaveStatus to show beside it. `run` saves and tracks
 * it; `retry` sends the last save again. Only the latest save's result is shown. Keep it in a
 * component that outlives the save: forms keyed by their saved values remount when one lands.
 */
export function useSaveStatus() {
  const [status, setStatus] = useState<SaveStatus>({ phase: "idle" });
  const lastSaveRef = useRef<(() => Promise<SaveResult>) | null>(null);
  const runsRef = useRef(0);

  useEffect(() => {
    if (status.phase !== "saved") return;
    const timer = setTimeout(() => setStatus({ phase: "idle" }), SAVED_FOR_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const run = useCallback(async (save: () => Promise<SaveResult>): Promise<SaveResult> => {
    lastSaveRef.current = save;
    const thisRun = ++runsRef.current;
    setStatus({ phase: "saving" });
    let result: SaveResult;
    try {
      result = await save();
    } catch {
      result = { ok: false, error: SAVE_THREW };
    }
    if (thisRun === runsRef.current) {
      setStatus(result.ok ? { phase: "saved", run: thisRun } : { phase: "failed", error: result.error });
    }
    return result;
  }, []);

  const retry = useCallback(async () => {
    if (lastSaveRef.current) await run(lastSaveRef.current);
  }, [run]);

  return { status, saving: status.phase === "saving", run, retry };
}

export type SaveTracker = ReturnType<typeof useSaveStatus>;
