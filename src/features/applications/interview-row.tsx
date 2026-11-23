"use client";

import { Check, ChevronRight, Pencil } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { DaysFromToday, InterviewDayTime } from "@/features/applications/application-when";
import { DateTile } from "@/features/applications/date-tile";
import { interviewHref } from "@/features/applications/routes";
import { TheyAsked } from "@/features/applications/interview-notes-form";
import {
  INTERVIEW_NOTES_LABELS,
  INTERVIEW_OPTIONS,
  hasInterviewNotes,
  paragraphs,
  questions,
  type Interview,
} from "@/lib/applications";

/** Notes longer than this fold on a phone, behind Show all notes. */
const FOLD_LENGTH = 140;

/**
 * One Interview in the Application page's Interviews card (BIG-174): a date tile, its kind, its day
 * and time. One still ahead says how far off it is, and "Add Interview notes" while it has none; a
 * completed one is marked Completed and shows its Interview notes in full (BIG-179: How it went, They
 * asked and the takeaway), folded to the first paragraph on a phone behind Show all notes. The kind is a link whose area covers the row, so the whole row
 * opens the Interview page, where it is edited; the notes sit above that, so their text can be
 * selected.
 */
export function InterviewRow({ applicationId, interview }: { applicationId: string; interview: Interview }) {
  const kind = INTERVIEW_OPTIONS[interview.kind].label;
  const completed = interview.completed;
  return (
    <li className="group relative flex gap-4 border-t border-line py-5 first:border-t-0 first:pt-2">
      <DateTile at={interview.at} tone={completed ? "muted" : "outline"} />
      <div className="min-w-0 flex-1">
        <p className="m-0 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <Link
            href={interviewHref(applicationId, interview.id)}
            className="text-lg font-bold leading-[1.3] text-heading after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand group-hover:text-fg-brand-strong"
          >
            <span className="sr-only">Open Interview: </span>
            {kind}
          </Link>
          {completed && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-fg-success-strong">
              <Check className="size-4" aria-hidden />
              Completed
            </span>
          )}
        </p>
        <p className="m-0 mt-1 text-sm text-body">
          <InterviewDayTime at={interview.at} />
          {!completed && (
            <>
              {" · "}
              <DaysFromToday date={interview.at} />
            </>
          )}
        </p>
        {completed && hasInterviewNotes(interview) && <Notes interview={interview} />}
      </div>
      <RowEnd completed={completed} hasNotes={hasInterviewNotes(interview)} />
    </li>
  );
}

/** The row's right edge, for the eye: what opening it is for. The link says it all to screen readers. */
function RowEnd({ completed, hasNotes }: { completed: boolean; hasNotes: boolean }) {
  if (completed) return <Pencil aria-hidden className="mt-1 size-5 shrink-0 self-center text-body group-hover:text-heading" />;
  return (
    <span aria-hidden className="flex shrink-0 items-center">
      {!hasNotes && <span className="hidden font-medium text-fg-brand sm:inline">Add Interview notes</span>}
      <ChevronRight className={`size-5 text-body ${hasNotes ? "" : "sm:hidden"}`} />
    </span>
  );
}

/**
 * A completed Interview's notes: How it went paragraph by paragraph, They asked as a list, then the
 * takeaway. On a phone, long ones show only the first of these, cut to three lines, and Show all
 * notes; wider screens always show them all.
 */
function Notes({ interview }: { interview: Interview }) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const notes = interview.how_it_went ?? "";
  // Keyed by their text, numbered when one repeats.
  const seen = new Map<string, number>();
  const parts = paragraphs(notes).map((text) => {
    const count = (seen.get(text) ?? 0) + 1;
    seen.set(text, count);
    return { text, key: `${count}:${text}` };
  });
  const asked = questions(interview.what_they_asked);
  const takeaway = interview.takeaway;
  const pieces = parts.length + (asked.length ? 1 : 0) + (takeaway ? 1 : 0);
  const folds = pieces > 1 || notes.length > FOLD_LENGTH;
  const folded = folds && !expanded;
  // On a phone, folded: only the first piece shows, cut to three lines.
  const fold = (index: number) => (folded ? (index === 0 ? "max-sm:line-clamp-3" : "max-sm:hidden") : "");
  return (
    <div className="relative z-10 mt-3 flex flex-col items-start gap-3">
      <div id={id} className="flex min-w-0 flex-col gap-3 text-base leading-[1.6] text-heading">
        {parts.map((part, index) => (
          <p key={part.key} className={`m-0 whitespace-pre-line break-words ${fold(index)}`}>
            {part.text}
          </p>
        ))}
        {asked.length > 0 && <TheyAsked questions={asked} className={`break-words ${fold(parts.length)}`} />}
        {takeaway && (
          <p className={`m-0 break-words ${fold(pieces - 1)}`}>
            <span className="font-bold">{INTERVIEW_NOTES_LABELS.takeaway}: </span>
            {takeaway}
          </p>
        )}
      </div>
      {folds && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
          className="touch-target rounded-control text-sm font-medium text-fg-brand hover:text-fg-brand-strong sm:hidden"
        >
          {expanded ? "Show less" : "Show all notes"}
        </button>
      )}
    </div>
  );
}
