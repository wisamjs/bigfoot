"use client";

import { useId, useState } from "react";
import { toneClasses } from "@/components/ui/badge";
import { SaveStatus } from "@/components/ui/save-status";
import { OUTCOME_TONE } from "@/features/applications/status-tone";
import { updateApplicationAction } from "@/app/applications/actions";
import type { SaveTracker } from "@/hooks/use-save-status";
import {
  OUTCOME_OPTIONS,
  OUTCOMES,
  STATUS_OPTIONS,
  STATUSES,
  type Application,
  type Outcome,
  type Status,
} from "@/lib/applications";

const OUTCOME_HINT = "Choose an Outcome to finish";

/**
 * An Application's Status and, once Done, its Outcome. There is no Save button: picking an
 * Outcome saves Done and that Outcome together, and picking In Progress on a Done Application
 * reopens it and clears the Outcome. Choosing Done saves nothing until an Outcome is picked, so a
 * Done Application is never saved without one. The save's status shows beside the controls.
 */
export function StatusForm({ app, tracker }: { app: Application; tracker: SaveTracker }) {
  const nameId = useId();
  // Done is chosen before its Outcome, so what's shown can be ahead of what's saved.
  const [chosen, setChosen] = useState<Status>(app.status);

  function chooseStatus(status: Status) {
    setChosen(status);
    if (status === "in_progress" && app.status === "done") {
      void tracker.run(() => updateApplicationAction(app.id, { status: "in_progress", outcome: null }));
    }
  }

  function chooseOutcome(outcome: Outcome) {
    void tracker.run(() => updateApplicationAction(app.id, { status: "done", outcome }));
  }

  const needsOutcome = chosen === "done" && !app.outcome;

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
        <legend className="mb-2 p-0 text-sm font-medium text-heading">Status</legend>
        <div className="inline-flex w-fit rounded-full border border-line-medium bg-surface p-1">
          {STATUSES.map((status) => (
            <label key={status} className="relative">
              <input
                type="radio"
                name={`${nameId}-status`}
                value={status}
                checked={chosen === status}
                onChange={() => chooseStatus(status)}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-9 cursor-pointer items-center rounded-full px-4 text-sm font-medium text-body transition-colors pointer-coarse:min-h-11 peer-checked:bg-brand peer-checked:text-on-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
                {STATUS_OPTIONS[status].label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {chosen === "done" && (
        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-sm font-medium text-heading">Outcome</legend>
          <div className="flex flex-wrap gap-2">
            {OUTCOMES.map((outcome) => (
              <label key={outcome} className="relative">
                <input
                  type="radio"
                  name={`${nameId}-outcome`}
                  value={outcome}
                  checked={app.outcome === outcome}
                  onChange={() => chooseOutcome(outcome)}
                  className="peer sr-only"
                />
                <span
                  className={`inline-flex min-h-9 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors pointer-coarse:min-h-11 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand ${
                    app.outcome === outcome
                      ? toneClasses[OUTCOME_TONE[outcome]]
                      : "border-line-medium bg-card-strong text-heading hover:border-line-brand-subtle"
                  }`}
                >
                  {OUTCOME_OPTIONS[outcome].label}
                </span>
              </label>
            ))}
          </div>
          {needsOutcome && <p className="m-0 text-xs text-body">{OUTCOME_HINT}</p>}
        </fieldset>
      )}

      <SaveStatus status={tracker.status} label="Status" onRetry={tracker.retry} />
    </div>
  );
}
