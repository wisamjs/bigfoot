"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { DateTimePicker, type DateAndTime } from "@/components/ui/date-time-picker";
import { FieldError } from "@/components/ui/field-error";
import { Modal } from "@/components/ui/modal";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { SaveResult } from "@/hooks/use-save-status";
import { InterviewDayTime } from "@/features/applications/application-when";
import { fromLocalInput } from "@/features/applications/local-datetime";
import type { StatusChange } from "@/features/applications/status-choices";
import {
  DATE_TBD,
  DIDNT_HAPPEN,
  OUTCOME_OPTIONS,
  roundTitle,
  roundNumber,
  type Application,
  type ApplicationChanges,
  type Interview,
  type InterviewAnswer,
} from "@/lib/applications";
import { happenedError } from "@/lib/validation";

/** What marking it Done asks about (interviewsToAsk), with the change it saves; null while closed. */
export type MarkDoneAsking = { change: StatusChange; interviews: Interview[] };

/**
 * One row's answer. An Unscheduled Interview happened (with when) or didn't; one still dated
 * after now is kept or didn't happen. Every row starts on didn't happen.
 */
type Answer = { happened: boolean; when: DateAndTime };

const NOT_YET: Answer = { happened: false, when: { date: "", time: "" } };

/**
 * The Mark done dialog (BIG-222), "Did these Interviews happen?": picking "Mark <Outcome>" on an In
 * Progress Application with Unscheduled Interviews, or ones dated after now, asks about each before
 * saving, one row per Interview by its Round number and title. An Unscheduled one is Yes or No, Yes
 * asking when it happened (in the past, not before the applied date); one still ahead is Didn't
 * happen, which clears its date, or Keep the date. Every row starts on No / Didn't happen, so one
 * click confirms. The Status, the Outcome and every answer save together, in one request; an
 * Interview left undated is Abandoned. A failure stays in the dialog, beside its button.
 */
export function MarkDoneDialog({
  app,
  asking,
  onConfirm,
  onClose,
}: {
  app: Application;
  asking: MarkDoneAsking | null;
  onConfirm: (changes: ApplicationChanges) => Promise<SaveResult>;
  onClose: () => void;
}) {
  return (
    <Modal open={asking !== null} onClose={onClose} title="Did these Interviews happen?">
      {/* Keyed, so each time it opens every row starts on No / Didn't happen again. */}
      {asking && <Questions key={asking.interviews.map((i) => i.id).join()} app={app} asking={asking} onConfirm={onConfirm} onClose={onClose} />}
    </Modal>
  );
}

function Questions({
  app,
  asking: { change, interviews },
  onConfirm,
  onClose,
}: {
  app: Application;
  asking: MarkDoneAsking;
  onConfirm: (changes: ApplicationChanges) => Promise<SaveResult>;
  onClose: () => void;
}) {
  const id = useId();
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const label = change.outcome ? `Mark ${OUTCOME_OPTIONS[change.outcome].label}` : "Mark done";
  const answerOf = (interview: Interview) => answers[interview.id] ?? NOT_YET;

  function answer(interview: Interview, next: Partial<Answer>) {
    setAnswers((prev) => ({ ...prev, [interview.id]: { ...answerOf(interview), ...next } }));
    setProblems((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== interview.id)));
  }

  function save() {
    const now = new Date();
    const checked = interviews.map((interview) => ({ interview, ...answerToSend(interview, answerOf(interview), app.applied_on, now) }));
    const found = Object.fromEntries(checked.flatMap(({ interview, problem }) => (problem ? [[interview.id, problem]] : [])));
    setProblems(found);
    const first = interviews.find((i) => found[i.id]);
    if (first) {
      document.getElementById(`${id}-${first.id}-at`)?.focus();
      return;
    }
    startTransition(async () => {
      const sent: InterviewAnswer[] = checked.map(({ interview, at }) => ({ id: interview.id, at }));
      const result = await onConfirm({ ...change, interviews: sent });
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4 pt-6">
      <p className="m-0 text-base leading-[1.625] text-body">
        An Interview that didn’t happen is kept, marked “{DIDNT_HAPPEN}”, and isn’t counted.
      </p>
      <ul className="m-0 flex max-h-[55vh] list-none flex-col gap-5 overflow-y-auto p-0">
        {interviews.map((interview) => (
          <Question
            key={interview.id}
            id={`${id}-${interview.id}`}
            round={roundNumber(app, interview)}
            interview={interview}
            answer={answerOf(interview)}
            problem={problems[interview.id]}
            disabled={isPending}
            onAnswer={(next) => answer(interview, next)}
          />
        ))}
      </ul>
      {error && (
        <p role="alert" className="m-0 text-sm text-fg-danger">
          {error}
        </p>
      )}
      <div className="mt-2 flex justify-end gap-3 border-t border-line pt-4">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} disabled={isPending}>
          {isPending ? "Saving…" : label}
        </Button>
      </div>
    </div>
  );
}

/**
 * What one answer sends, and its problem if it can't be sent. One still ahead is kept with the date
 * it has, or didn't happen (null). An Unscheduled one that happened needs when, in the past and not
 * before the applied date; one that didn't stays undated.
 */
function answerToSend(interview: Interview, { happened, when }: Answer, appliedOn: string, now: Date): { at: string | null; problem: string | null } {
  if (interview.at !== null) return { at: happened ? interview.at : null, problem: null };
  if (!happened) return { at: null, problem: null };
  const at = when.date && when.time ? fromLocalInput(`${when.date}T${when.time}`) : null;
  return { at, problem: happenedError(at, appliedOn, now) };
}

/**
 * One Interview's row: "Round 3 · Leadership", then "Date TBD" or its day and time, and its two
 * choices. Yes on an Unscheduled one opens its date and time.
 */
function Question({
  id,
  round,
  interview,
  answer,
  problem,
  disabled,
  onAnswer,
}: {
  id: string;
  round: number;
  interview: Interview;
  answer: Answer;
  problem: string | undefined;
  disabled: boolean;
  onAnswer: (next: Partial<Answer>) => void;
}) {
  const unscheduled = interview.at === null;
  const [yes, no] = unscheduled ? ["Yes", "No"] : ["Keep the date", DIDNT_HAPPEN];
  return (
    <li aria-labelledby={`${id}-title`} className="flex flex-col gap-3 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <p id={`${id}-title`} className="m-0 break-words text-base font-bold text-heading">
          {roundTitle(round, interview.title)}
        </p>
        <p className="m-0 mt-0.5 text-sm text-body">{interview.at === null ? DATE_TBD : <InterviewDayTime at={interview.at} />}</p>
      </div>
      <ToggleGroup
        type="single"
        // Its items are radios: one answer per row, named by the row's title.
        role="radiogroup"
        aria-labelledby={`${id}-title`}
        value={answer.happened ? "yes" : "no"}
        // Picking the chosen one again leaves it chosen: a row always has an answer.
        onValueChange={(value) => value && onAnswer({ happened: value === "yes" })}
        disabled={disabled}
      >
        {/* No / Didn't happen first: where every row starts. */}
        <ToggleGroupItem value="no">{no}</ToggleGroupItem>
        <ToggleGroupItem value="yes">{yes}</ToggleGroupItem>
      </ToggleGroup>
      {unscheduled && answer.happened && (
        <fieldset aria-labelledby={`${id}-when`} className="m-0 min-w-0 border-0 p-0">
          <span id={`${id}-when`} className="mb-2 block text-sm font-medium text-heading">
            When did it happen?
          </span>
          <DateTimePicker
            id={`${id}-at`}
            dateLabel="Date"
            timeLabel="Time"
            value=""
            disabled={disabled}
            onInput={(when) => onAnswer({ when })}
            invalid={problem ? { date: true, time: true } : undefined}
            aria-describedby={`${id}-error`}
          />
          <FieldError id={`${id}-error`} error={problem} />
        </fieldset>
      )}
    </li>
  );
}
