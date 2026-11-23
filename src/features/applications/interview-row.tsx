"use client";

import { Check, ChevronRight, Pencil } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { DaysFromToday, InterviewDayTime } from "@/features/applications/application-when";
import { DateTile } from "@/features/applications/date-tile";
import { interviewHref } from "@/features/applications/routes";
import { INTERVIEW_OPTIONS, paragraphs, type Interview } from "@/lib/applications";

/** Notes longer than this fold on a phone, behind Show all notes. */
const FOLD_LENGTH = 140;

/**
 * One Interview in the Application page's Interviews card (BIG-174): a date tile, its kind, its day
 * and time. One still ahead says how far off it is, and "Add Interview notes" while it has none; a
 * completed one is marked Done and shows its Interview notes in full, folded to the first paragraph
 * on a phone behind Show all notes. The kind is a link whose area covers the row, so the whole row
 * opens the Interview page, where it is edited; the notes sit above that, so their text can be
 * selected.
 */
export function InterviewRow({ applicationId, interview }: { applicationId: string; interview: Interview }) {
  const kind = INTERVIEW_OPTIONS[interview.kind].label;
  const done = interview.completed;
  return (
    <li className="group relative flex gap-4 border-t border-line py-5 first:border-t-0 first:pt-2">
      <DateTile at={interview.at} tone={done ? "muted" : "outline"} />
      <div className="min-w-0 flex-1">
        <p className="m-0 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <Link
            href={interviewHref(applicationId, interview.id)}
            className="text-lg font-bold leading-[1.3] text-heading after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand group-hover:text-fg-brand-strong"
          >
            <span className="sr-only">Open Interview: </span>
            {kind}
          </Link>
          {done && interview.at && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-fg-success-strong">
              <Check className="size-4" aria-hidden />
              Done
            </span>
          )}
        </p>
        <p className="m-0 mt-1 text-sm text-body">
          <InterviewDayTime at={interview.at} />
          {!done && interview.at && (
            <>
              {" · "}
              <DaysFromToday date={interview.at} />
            </>
          )}
        </p>
        {done && interview.notes && <Notes notes={interview.notes} />}
      </div>
      <RowEnd done={done} hasNotes={Boolean(interview.notes)} />
    </li>
  );
}

/** The row's right edge, for the eye: what opening it is for. The link says it all to screen readers. */
function RowEnd({ done, hasNotes }: { done: boolean; hasNotes: boolean }) {
  if (done) return <Pencil aria-hidden className="mt-1 size-5 shrink-0 self-center text-body group-hover:text-heading" />;
  return (
    <span aria-hidden className="flex shrink-0 items-center">
      {!hasNotes && <span className="hidden font-medium text-fg-brand sm:inline">Add Interview notes</span>}
      <ChevronRight className={`size-5 text-body ${hasNotes ? "" : "sm:hidden"}`} />
    </span>
  );
}

/**
 * A completed Interview's notes, paragraph by paragraph. On a phone, long ones show the first
 * paragraph, cut to three lines, and Show all notes; wider screens always show them all.
 */
function Notes({ notes }: { notes: string }) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  // Keyed by their text, numbered when one repeats.
  const seen = new Map<string, number>();
  const parts = paragraphs(notes).map((text) => {
    const count = (seen.get(text) ?? 0) + 1;
    seen.set(text, count);
    return { text, key: `${count}:${text}` };
  });
  const folds = parts.length > 1 || notes.length > FOLD_LENGTH;
  const folded = folds && !expanded;
  return (
    <div className="relative z-10 mt-3 flex flex-col items-start gap-3">
      <div id={id} className="flex flex-col gap-3">
        {parts.map((part, index) => (
          <p
            key={part.key}
            className={`m-0 whitespace-pre-line break-words text-base leading-[1.6] text-heading ${
              folded ? (index === 0 ? "max-sm:line-clamp-3" : "max-sm:hidden") : ""
            }`}
          >
            {part.text}
          </p>
        ))}
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
