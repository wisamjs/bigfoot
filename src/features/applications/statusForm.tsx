"use client";

import { useId, useState, type FormEvent } from "react";
import { updateApplicationAction } from "@/app/applications/actions";
import { Button } from "@/components/ui/button";
import { Field, RequiredNote } from "@/components/ui/field";
import { inputClasses } from "@/components/ui/input";
import { SaveStatus } from "@/components/ui/saveStatus";
import { useUnsavedChanges } from "@/features/applications/unsavedChanges";
import type { SaveTracker } from "@/hooks/useSaveStatus";
import {
  OUTCOME_OPTIONS,
  OUTCOMES,
  STATUS_OPTIONS,
  STATUSES,
  type Application,
  type Outcome,
  type Status,
} from "@/lib/applications";

/** An Application's Status, and its Outcome once Done; they save together with one button. */
export function StatusForm({ app, tracker }: { app: Application; tracker: SaveTracker }) {
  const id = useId();
  const [status, setStatus] = useState<Status>(app.status);
  const [outcome, setOutcome] = useState<Outcome | "">(app.outcome ?? "");
  const dirty = status !== app.status || (status === "done" && outcome !== (app.outcome ?? ""));
  // Status and Outcome save with their button, so a change not yet saved is lost on leaving.
  useUnsavedChanges(dirty, () =>
    document.getElementById(`${id}-${status === "done" && !outcome ? "outcome" : "status"}`)?.focus(),
  );

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = status === "done" ? { status, outcome: outcome || null } : { status, outcome: null };
    void tracker.run(() => updateApplicationAction(app.id, fields));
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <RequiredNote className="w-full" />
      <Field id={`${id}-status`} label="Status" required className="min-w-40 flex-1">
        <select
          id={`${id}-status`}
          required
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          className={inputClasses}
        >
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_OPTIONS[value].label}
            </option>
          ))}
        </select>
      </Field>
      {status === "done" && (
        <Field id={`${id}-outcome`} label="Outcome" required className="min-w-40 flex-1">
          <select
            id={`${id}-outcome`}
            value={outcome}
            required
            onChange={(e) => setOutcome(e.target.value as Outcome)}
            className={inputClasses}
          >
            <option value="" disabled>
              Choose an Outcome
            </option>
            {OUTCOMES.map((value) => (
              <option key={value} value={value}>
                {OUTCOME_OPTIONS[value].label}
              </option>
            ))}
          </select>
        </Field>
      )}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <SaveStatus status={tracker.status} label="Status" onRetry={tracker.retry} />
        <Button type="submit" disabled={!dirty || tracker.saving}>
          Save status
        </Button>
      </div>
    </form>
  );
}
