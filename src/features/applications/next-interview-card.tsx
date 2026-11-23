import { ArrowRight, Lightbulb, Plus } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { DaysFromToday, InterviewDayTime } from "@/features/applications/application-when";
import { DateTile } from "@/features/applications/date-tile";
import { interviewHref } from "@/features/applications/routes";
import { carriedForward, INTERVIEW_OPTIONS, type Application, type Interview } from "@/lib/applications";

/**
 * The Application's next Interview, first on its page (BIG-174): when it is, its kind, and Open
 * Interview. Under them, what the last completed Interview's notes carry forward (their last
 * paragraph), and this Interview's own Interview notes, or Add Interview notes to start them on its
 * Interview page.
 */
export function NextInterviewCard({ app, interview }: { app: Application; interview: Interview }) {
  const href = interviewHref(app.id, interview.id);
  const kind = INTERVIEW_OPTIONS[interview.kind].label;
  const carried = carriedForward(app);
  return (
    <section aria-labelledby="next-up-title" className="card flex flex-col gap-5 border-line-brand-subtle p-5 sm:p-8">
      <div className="flex items-start gap-4">
        <DateTile at={interview.at} tone="brand" className="hidden sm:flex" />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-fg-brand">
            Next up
            {interview.at && (
              <>
                {" · "}
                <DaysFromToday date={interview.at} />
              </>
            )}
          </p>
          <h2 id="next-up-title" className="m-0 mt-1 break-words text-2xl font-bold leading-[1.2] text-heading">
            {kind}
          </h2>
          <p className="m-0 mt-1 text-base text-body">
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

      {carried && (
        <div className="flex gap-3 rounded-card bg-surface p-4">
          <Lightbulb className="mt-0.5 size-5 shrink-0 text-fg-brand" aria-hidden />
          <div className="min-w-0">
            <p className="m-0 text-sm text-body">
              Carried forward from {INTERVIEW_OPTIONS[carried.from.kind].label} notes
            </p>
            <p className="m-0 mt-1 whitespace-pre-line break-words text-base text-heading">{carried.text}</p>
          </div>
        </div>
      )}

      {interview.notes && (
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-medium text-body">Interview notes</h3>
          <p className="m-0 mt-1 line-clamp-6 whitespace-pre-line break-words text-base text-heading">{interview.notes}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {!interview.notes && (
          <>
            <Link href={href} className={`${buttonClasses("brand")} max-sm:flex-1`}>
              <Plus className="size-4" aria-hidden />
              Add Interview notes
            </Link>
            <span className="hidden text-sm text-body sm:inline">No Interview notes yet.</span>
          </>
        )}
        <Link href={href} className={`${buttonClasses("secondary")} max-sm:flex-1 sm:hidden`}>
          Open Interview
        </Link>
      </div>
    </section>
  );
}
