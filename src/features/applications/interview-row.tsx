"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useIsClient } from "@/hooks/use-is-client";
import { InterviewWhen } from "@/features/applications/application-when";
import { interviewHref } from "@/features/applications/routes";
import { INTERVIEW_TONE } from "@/features/applications/status-tone";
import { INTERVIEW_OPTIONS, type Interview } from "@/lib/applications";

const spokenFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" });

/** How much of the first line a row shows: about two lines on a phone. */
const PREVIEW_LENGTH = 100;

/**
 * The first line of an Interview's notes, shortened at a word to about PREVIEW_LENGTH characters
 * and ended with "…" when it is longer; nothing when it has none. It wraps rather than being cut
 * off by CSS, which a phone would leave at a few words (docs/guidelines/mobile.md).
 */
function notesPreview(notes: string | null) {
  const line = notes?.split("\n").find((l) => l.trim())?.trim() ?? "";
  if (line.length <= PREVIEW_LENGTH) return line;
  const cut = line.slice(0, PREVIEW_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > PREVIEW_LENGTH / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * One Interview on its Application page, read-only, like the dashboard agenda's: its kind, "Next"
 * on the next one, the first line of its Interview notes, and its date and time. The whole row is a
 * link to its Interview page, where it is edited. A past Interview is muted.
 */
export function InterviewRow({
  applicationId,
  interview,
  next,
}: {
  applicationId: string;
  interview: Interview;
  /** The Application's next Interview: the soonest one still ahead. */
  next: boolean;
}) {
  const kind = INTERVIEW_OPTIONS[interview.kind].label;
  const past = interview.completed;
  const preview = notesPreview(interview.notes);
  return (
    <li>
      <Link
        href={interviewHref(applicationId, interview.id)}
        className="group flex min-h-11 items-center gap-3 rounded-control border border-transparent bg-surface px-3 py-2 text-sm transition-all duration-200 hover:border-line-medium hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {/* The link's name, in full; the row below is the same, laid out for the eye (WCAG 2.5.3:
            a name from the content, not an aria-label that leaves the visible text out). */}
        <span className="sr-only">
          <SpokenName kind={kind} at={interview.at} next={next} preview={preview} />
        </span>
        <span aria-hidden className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={past ? "gray" : INTERVIEW_TONE[interview.kind]}>{kind}</Badge>
            {next && <Badge tone="brand">Next</Badge>}
          </span>
          {preview && <span className="break-words text-xs text-body">{preview}</span>}
        </span>
        <span aria-hidden className={`shrink-0 text-right ${past ? "text-body" : "font-medium text-heading"}`}>
          <InterviewWhen at={interview.at} />
        </span>
        <ChevronRight
          className="size-4 shrink-0 text-body transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </li>
  );
}

/** What screen readers hear for a row: "Open Interview: Technical, next, Thursday, 4 December 2026 at 10:00. Notes: …". */
function SpokenName({ kind, at, next, preview }: { kind: string; at: string | null; next: boolean; preview: string }) {
  // The server can't know the viewer's time zone, so the date is added after hydration.
  const isClient = useIsClient();
  const when = at ? (isClient ? spokenFormat.format(new Date(at)) : "") : "Date needed";
  const parts = [`Open Interview: ${kind}`, next ? "next Interview" : "", when].filter(Boolean);
  return `${parts.join(", ")}.${preview ? ` Notes: ${preview}` : ""}`;
}
