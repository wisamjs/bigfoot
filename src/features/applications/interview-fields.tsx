"use client";

import { useState, type ReactNode } from "react";
import { updateInterviewAction } from "@/app/applications/actions";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { RequiredMark } from "@/components/ui/field";
import { FieldError, invalidProps } from "@/components/ui/field-error";
import { inputClasses } from "@/components/ui/input";
import { SaveStatus } from "@/components/ui/save-status";
import { useSaveStatus, type SaveResult, type SaveTracker } from "@/hooks/use-save-status";
import { InterviewNotesForm } from "@/features/applications/interview-notes-form";
import { fromLocalInput, toLocalInput } from "@/features/applications/local-datetime";
import {
  INTERVIEW_KINDS,
  INTERVIEW_OPTIONS,
  type Application,
  type Interview,
  type InterviewFields as Fields,
  type InterviewKind,
} from "@/lib/applications";
import { DATE_NEEDED, interviewErrors, isValid, type FieldErrors } from "@/lib/validation";

const fieldLabelClasses = "mb-1 flex min-h-4 flex-wrap items-center justify-between gap-x-2 text-xs font-medium text-body";

/**
 * One Interview's fields, editable: its kind (saved on change), date and time (saved once both are
 * given, on picking a date or leaving the time field), and its Interview notes (a draft, saved
 * after a pause in typing and on leaving them). Each has its own save status, kept here because
 * the kind and date are keyed by their saved values and remount when a save lands, so the caller
 * keys this by the Interview. An Interview saved before dates were required shows "Date needed"
 * beside its date, and no other change saves until it has one (docs/adr/0005).
 * The Application page's Interview rows show it; the Interview page edits the kind and date in its
 * heading instead (InterviewHeading). `label` ("Interview 2") tells a row's fields apart for screen
 * readers; `actions` (a row's Delete) sit after the date.
 */
export function InterviewFields({
  app,
  interview,
  label,
  actions,
}: {
  app: Application;
  interview: Interview;
  label?: string;
  actions?: ReactNode;
}) {
  const kindSave = useSaveStatus();
  const atSave = useSaveStatus();
  const notesSave = useSaveStatus();
  // The kind's and date's errors, found before sending or by the API, beside their fields.
  const [errors, setErrors] = useState<FieldErrors>(() => (interview.at ? {} : { at: DATE_NEEDED }));
  const saved = toLocalInput(interview.at);
  const named = label ? `${label} ` : "Interview ";
  const suffix = label ? <span className="sr-only">, {label}</span> : null;

  /**
   * Checks one change with the API's rules, then saves it, or shows why not beside its field (and
   * beside the date, when the Interview has none). Returns the problems found before sending, and
   * the save when one was sent.
   */
  function saveChange(
    tracker: SaveTracker,
    changes: Partial<Fields>,
  ): { problems: FieldErrors; sent: Promise<SaveResult> | null } {
    const problems = interviewErrors(changes, { savedAt: interview.at });
    const checked = Object.fromEntries(Object.keys(changes).map((name) => [name, problems[name]]));
    setErrors((prev) => ({ ...prev, ...checked, ...(problems.at ? { at: problems.at } : {}) }));
    if (!isValid(problems)) return { problems, sent: null };
    const sent = tracker.run(async () => {
      const result = await updateInterviewAction(app.id, interview.id, changes);
      if (!result.ok && result.fieldErrors) setErrors((prev) => ({ ...prev, ...result.fieldErrors }));
      return result;
    });
    return { problems, sent };
  }

  return (
    <>
      <div className="min-w-44 flex-1">
        <div className={fieldLabelClasses}>
          <span>
            <label htmlFor={`kind-${interview.id}`}>Kind{suffix}</label>
            <RequiredMark />
          </span>
          <SaveStatus status={kindSave.status} label={`${named}kind`} onRetry={kindSave.retry} />
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
            <span id={`at-${interview.id}-label`}>Date and time{suffix}</span>
            <RequiredMark />
          </span>
          <SaveStatus status={atSave.status} label={`${named}date and time`} onRetry={atSave.retry} />
        </div>
        <fieldset aria-labelledby={`at-${interview.id}-label`} className="m-0 min-w-0 border-0 p-0">
          <DateTimePicker
            key={saved}
            id={`at-${interview.id}`}
            dateLabel={label ? `Date, ${label}` : "Date"}
            timeLabel={label ? `Time, ${label}` : "Time"}
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
      {actions}
      <InterviewNotesForm
        interview={interview}
        label={label}
        tracker={notesSave}
        onSave={(notes) => {
          const { problems, sent } = saveChange(notesSave, { notes });
          return { problem: problems.notes, sent };
        }}
      />
    </>
  );
}
