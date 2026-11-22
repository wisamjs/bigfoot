"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteInterviewAction, updateInterviewAction } from "@/app/applications/actions";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { RequiredMark } from "@/components/ui/field";
import { FieldError, invalidProps } from "@/components/ui/field-error";
import { inputClasses } from "@/components/ui/input";
import { SaveStatus } from "@/components/ui/save-status";
import { useSaveStatus, type SaveTracker } from "@/hooks/use-save-status";
import { InterviewNotesForm } from "@/features/applications/interview-notes-form";
import { fromLocalInput, toLocalInput } from "@/features/applications/local-datetime";
import {
  INTERVIEW_KINDS,
  INTERVIEW_OPTIONS,
  type Application,
  type Interview,
  type InterviewFields,
  type InterviewKind,
} from "@/lib/applications";
import { interviewErrors, isValid, type FieldErrors } from "@/lib/validation";

const fieldLabelClasses = "mb-1 flex min-h-4 flex-wrap items-center justify-between gap-x-2 text-xs font-medium text-body";

/**
 * One Interview: its kind (saved on change), date and time (saved once both are given, on picking
 * a date or leaving the time field), Delete, and its Interview notes. Each has its own save status,
 * kept here because the fields are keyed by their saved values and remount when a save lands; this
 * row is keyed by the Interview.
 */
export function InterviewRow({
  app,
  interview,
  position,
}: {
  app: Application;
  interview: Interview;
  /** 1 for the Application's first Interview. */
  position: number;
}) {
  const kindSave = useSaveStatus();
  const atSave = useSaveStatus();
  const notesSave = useSaveStatus();
  const deleteSave = useSaveStatus();
  // The kind's and date's errors, found before sending or by the API, beside their fields.
  const [errors, setErrors] = useState<FieldErrors>({});
  const saved = toLocalInput(interview.at);
  const label = `Interview ${position}`;
  const kindLabel = INTERVIEW_OPTIONS[interview.kind].label;

  /**
   * Checks one change with the API's rules, then saves it, or shows why not beside its field. Returns the problems found before sending.
   */
  function saveChange(tracker: SaveTracker, changes: Partial<InterviewFields>): FieldErrors {
    const problems = interviewErrors(changes);
    const checked = Object.fromEntries(Object.keys(changes).map((name) => [name, problems[name]]));
    setErrors((prev) => ({ ...prev, ...checked }));
    if (isValid(problems)) {
      void tracker.run(async () => {
        const result = await updateInterviewAction(app.id, interview.id, changes);
        if (!result.ok && result.fieldErrors) setErrors((prev) => ({ ...prev, ...result.fieldErrors }));
        return result;
      });
    }
    return problems;
  }

  return (
    <li className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-3">
      <div className="min-w-44 flex-1">
        <div className={fieldLabelClasses}>
          <span>
            <label htmlFor={`kind-${interview.id}`}>
              Kind<span className="sr-only">, {label}</span>
            </label>
            <RequiredMark />
          </span>
          <SaveStatus status={kindSave.status} label={`${label} kind`} onRetry={kindSave.retry} />
        </div>
        <select
          // Keyed by the saved value, like the other fields: a save resets only the field it changed,
          // so notes being written survive a change of kind or date. A failed save changes no key,
          // so the field keeps what was picked.
          key={interview.kind}
          id={`kind-${interview.id}`}
          defaultValue={interview.kind}
          disabled={kindSave.saving}
          required
          onChange={(e) => saveChange(kindSave, { kind: e.target.value as InterviewKind })}
          className={inputClasses}
          {...invalidProps(`kind-${interview.id}-error`, errors.kind)}
        >
          {INTERVIEW_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {INTERVIEW_OPTIONS[kind].label}
            </option>
          ))}
        </select>
        <FieldError id={`kind-${interview.id}-error`} error={errors.kind} />
      </div>
      <div className="min-w-52 flex-1">
        <div className={fieldLabelClasses}>
          <span>
            <span id={`at-${interview.id}-label`}>
              Date and time<span className="sr-only">, {label}</span>
            </span>
            <RequiredMark />
          </span>
          <SaveStatus status={atSave.status} label={`${label} date and time`} onRetry={atSave.retry} />
        </div>
        <fieldset aria-labelledby={`at-${interview.id}-label`} className="m-0 min-w-0 border-0 p-0">
          <DateTimePicker
            key={saved}
            id={`at-${interview.id}`}
            dateLabel={`Date, ${label}`}
            timeLabel={`Time, ${label}`}
            value={saved}
            disabled={atSave.saving}
            // A date with no time yet waits for one; no time is assumed. Clearing the date is refused.
            onChange={({ date, time }) => {
              if (!date) saveChange(atSave, { at: null });
              else if (time) saveChange(atSave, { at: fromLocalInput(`${date}T${time}`) });
            }}
            invalid={errors.at ? { date: true, time: true } : undefined}
            aria-describedby={`at-${interview.id}-error`}
          />
        </fieldset>
        <FieldError id={`at-${interview.id}-error`} error={errors.at} />
      </div>
      <button
        type="button"
        disabled={deleteSave.saving}
        onClick={() => void deleteSave.run(() => deleteInterviewAction(app.id, interview.id))}
        aria-label={`Delete ${kindLabel} Interview, ${label}`}
        className="rounded-control p-2.5 text-body transition-colors hover:bg-danger-soft hover:text-fg-danger disabled:cursor-not-allowed disabled:opacity-60"
      >
        {deleteSave.saving ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="size-4" aria-hidden />
        )}
      </button>
      {/* Only while deleting or when it failed: once it works, the row is gone. Rendered only
          then, so an empty status doesn't add a line to every row. */}
      {(deleteSave.status.phase === "saving" || deleteSave.status.phase === "failed") && (
        <SaveStatus
          status={deleteSave.status}
          label={`Deleting ${label}`}
          savingText="Deleting…"
          onRetry={deleteSave.retry}
          className="w-full justify-end"
        />
      )}
      <InterviewNotesForm
        key={interview.notes ?? ""}
        interview={interview}
        label={label}
        tracker={notesSave}
        onSave={(notes) => saveChange(notesSave, { notes }).notes}
      />
    </li>
  );
}
