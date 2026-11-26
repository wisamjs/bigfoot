import { Info } from "lucide-react";
import { DateTile } from "@/features/applications/date-tile";
import { calendarDaysBetween, INTERVIEW_CATEGORY_EXPLAINED, relativeDays } from "@/lib/applications";
import type { DatedJourneyInterview } from "@/lib/journey";

const dayTimeFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

/**
 * The Journey's next Interview (BIG-197): its date tile, "Next Interview · Tomorrow", its title at the
 * company, its day and time in the Viewer's time zone, and what this kind of Interview is, in plain
 * words. Rendered in the browser only (JourneyView), so `now` is the Viewer's.
 */
export function JourneyNextInterview({ next, now }: { next: DatedJourneyInterview; now: Date }) {
  const { application, interview } = next;
  const at = new Date(interview.at);
  const when = relativeDays(calendarDaysBetween(now, at));
  return (
    <section aria-labelledby="journey-next-title" className="card flex flex-col gap-5 border-line-brand-subtle p-5 sm:p-8">
      <div className="flex items-start gap-4">
        <DateTile at={interview.at} tone="brand" />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-fg-brand">Next Interview · {when}</p>
          <h2 id="journey-next-title" className="m-0 mt-1 break-words text-2xl font-bold leading-[1.2] text-heading">
            {interview.title} at {application.company}
          </h2>
          <p className="m-0 mt-1 text-base text-body">
            <time dateTime={interview.at}>
              {dayTimeFormat.format(at)} · {timeFormat.format(at)}
            </time>{" "}
            your time
          </p>
        </div>
      </div>
      <p className="m-0 flex items-start gap-3 rounded-control bg-surface px-4 py-3 text-sm leading-[1.6] text-body">
        <Info className="mt-0.5 size-4 shrink-0 text-fg-brand" aria-hidden />
        <span>
          <strong className="font-semibold text-heading">What this is:</strong> {INTERVIEW_CATEGORY_EXPLAINED[interview.category]}
        </span>
      </p>
    </section>
  );
}
