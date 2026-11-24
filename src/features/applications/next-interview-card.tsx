import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { DaysFromToday, InterviewDayTime } from "@/features/applications/application-when";
import { DateTile } from "@/features/applications/date-tile";
import { NO_LOOK_BACK } from "@/features/applications/interview-notes-form";
import { PrepLookBack } from "@/features/applications/prep-look-back";
import { interviewHref } from "@/features/applications/routes";
import {
  hasInterviewNotes,
  INTERVIEW_NOTES_FIELDS,
  INTERVIEW_NOTES_LABELS,
  INTERVIEW_OPTIONS,
  type Application,
  type Interview,
  type PrepLookBack as LookBack,
} from "@/lib/applications";

/**
 * The Application's next Interview, first on its page (BIG-174): when it is, its kind, and Open
 * Interview. Under them, what its prep looks back at (BIG-181): up to two takeaways and They
 * asked last time, as on its Interview page. Then this Interview's own Interview notes, each field
 * that has text under its name, or Add Interview notes to start them on its Interview page.
 *
 * On the dashboard (`on="dashboard"`, BIG-183), the job seeker's soonest upcoming Interview: the
 * line under its kind names the company and role too, and the card shows its Prep notes, or Add
 * Prep notes, instead of Interview notes, as it is there to get ready.
 */
export function NextInterviewCard({
  app,
  interview,
  lookBack = NO_LOOK_BACK,
  on = "application",
}: {
  app: Application;
  interview: Interview;
  lookBack?: LookBack;
  on?: "application" | "dashboard";
}) {
  const href = interviewHref(app.id, interview.id);
  const kind = INTERVIEW_OPTIONS[interview.kind].label;
  const dashboard = on === "dashboard";
  const notesName = dashboard ? "Prep notes" : "Interview notes";
  const notes = dashboard
    ? interview.prep_notes
      ? [{ key: "prep_notes", label: null, text: interview.prep_notes }]
      : []
    : INTERVIEW_NOTES_FIELDS.filter((field) => interview[field]).map((field) => ({
        key: field,
        label: INTERVIEW_NOTES_LABELS[field],
        text: interview[field],
      }));
  const hasNotes = dashboard ? Boolean(interview.prep_notes) : hasInterviewNotes(interview);
  return (
    <section aria-labelledby="next-up-title" className="card flex flex-col gap-5 border-line-brand-subtle p-5 sm:p-8">
      <div className="flex items-start gap-4">
        <DateTile at={interview.at} tone="brand" className="hidden sm:flex" />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-fg-brand">
            Next up
            {" · "}
            <DaysFromToday date={interview.at} />
          </p>
          <h2 id="next-up-title" className="m-0 mt-1 break-words text-2xl font-bold leading-[1.2] text-heading">
            {kind}
          </h2>
          <p className="m-0 mt-1 break-words text-base text-body">
            {dashboard && `${app.company} · ${app.title} · `}
            <InterviewDayTime at={interview.at} weekday="long" />
          </p>
        </div>
        <Link
          href={href}
          className="touch-target hidden shrink-0 items-center gap-1.5 rounded-control font-medium text-fg-brand transition-colors hover:text-fg-brand-strong sm:inline-flex"
        >
          Open Interview
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <PrepLookBack lookBack={lookBack} />

      {hasNotes && (
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-medium text-body">{notesName}</h3>
          {notes.map((note) => (
            <p key={note.key} className="m-0 mt-1 line-clamp-6 whitespace-pre-line break-words text-base text-heading">
              {note.label && <span className="font-bold">{note.label}: </span>}
              {note.text}
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {!hasNotes && (
          <>
            <Link href={href} className={`${buttonClasses("brand")} max-sm:flex-1`}>
              <Plus className="size-4" aria-hidden />
              Add {notesName}
            </Link>
            <span className="hidden text-sm text-body sm:inline">No {notesName} yet.</span>
          </>
        )}
        <Link href={href} className={`${buttonClasses("secondary")} max-sm:flex-1 sm:hidden`}>
          Open Interview
        </Link>
      </div>
    </section>
  );
}
