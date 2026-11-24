import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { DaysFromToday, InterviewDayTime } from "@/features/applications/application-when";
import { DateTile } from "@/features/applications/date-tile";
import { NO_LOOK_BACK } from "@/features/applications/interview-notes-form";
import { PrepLookBack } from "@/features/applications/prep-look-back";
import { interviewHref } from "@/features/applications/routes";
import {
  INTERVIEW_OPTIONS,
  type Application,
  type Interview,
  type PrepLookBack as LookBack,
} from "@/lib/applications";

/**
 * The Application's next Interview, first on its page (BIG-174): when it is, its kind, and Open
 * Interview. Under them, what its prep looks back at (BIG-181): up to two takeaways and They
 * asked last time, as on its Interview page. Then its Prep notes, or Add Prep notes to start them
 * on its Interview page: the card is there to get ready, and Interview notes come after (BIG-187).
 *
 * On the dashboard (`on="dashboard"`, BIG-183), the job seeker's soonest upcoming Interview: the
 * line under its kind names the company and role too.
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
  const prepNotes = interview.prep_notes;
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

      {prepNotes && (
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-medium text-body">Prep notes</h3>
          <p className="m-0 mt-1 line-clamp-6 whitespace-pre-line break-words text-base text-heading">{prepNotes}</p>
        </div>
      )}

      {/* min-w-fit: on touch screens .btn's 44px floor replaces a flex item's automatic minimum, so
          without it the two flex-1 buttons squeeze below their labels instead of wrapping (BIG-187). */}
      <div className="flex flex-wrap items-center gap-3">
        {!prepNotes && (
          <>
            <Link href={href} className={`${buttonClasses("brand")} min-w-fit max-sm:flex-1`}>
              <Plus className="size-4" aria-hidden />
              Add Prep notes
            </Link>
            <span className="hidden text-sm text-body sm:inline">No Prep notes yet.</span>
          </>
        )}
        <Link href={href} className={`${buttonClasses("secondary")} min-w-fit max-sm:flex-1 sm:hidden`}>
          Open Interview
        </Link>
      </div>
    </section>
  );
}
