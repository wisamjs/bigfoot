import { ArrowRight, CalendarPlus, Plus } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { DaysFromToday, InterviewDayTime } from "@/features/applications/application-when";
import { CategoryBadge } from "@/features/applications/category-badge";
import { DateTile } from "@/features/applications/date-tile";
import { MarkdownView } from "@/components/ui/markdown-view";
import { NO_LOOK_BACK } from "@/features/applications/interview-notes-form";
import { PrepLookBack } from "@/features/applications/prep-look-back";
import { addDateHref, interviewHref } from "@/features/applications/routes";
import { roundNumber, roundTitle, type Application, type Interview, type PrepLookBack as LookBack } from "@/lib/applications";

/**
 * The Application's next Interview, first on its page (BIG-174): when it is, its title after its
 * Round number ("Round 3 · Retrospective System Design", BIG-190) and its category, and Open
 * Interview. Under them, what its prep looks back at (BIG-181): up to two takeaways and They
 * asked last time, as on its Interview page. Then its Prep notes, or Add Prep notes to start them
 * on its Interview page: the card is there to get ready, and Interview notes come after (BIG-187).
 *
 * An Unscheduled Interview (BIG-221), next when nothing is Scheduled, has a "TBD" tile, "Next up ·
 * date TBD", and Add the date, which opens its Interview page with Edit details open.
 *
 * On the dashboard (`on="dashboard"`, BIG-183), the job seeker's soonest upcoming Interview: the
 * line under its title names the company and role too.
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
  const dashboard = on === "dashboard";
  const prepNotes = interview.prep_notes;
  return (
    <section aria-labelledby="next-up-title" className="card flex flex-col gap-5 border-line-brand-subtle p-5 sm:p-8">
      <div className="flex items-start gap-4">
        <DateTile at={interview.at} tone="brand" className="hidden sm:flex" />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-fg-brand">
            Next up · <WhenOff at={interview.at} />
          </p>
          <h2 id="next-up-title" className="m-0 mt-1 break-words text-2xl font-bold leading-[1.2] text-heading">
            {roundTitle(roundNumber(app, interview), interview.title)}
          </h2>
          <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 break-words text-base text-body">
            <CategoryBadge category={interview.category} />
            <Where app={app} at={interview.at} dashboard={dashboard} />
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
          <MarkdownView markdown={prepNotes} headingLevel={4} className="mt-1 line-clamp-6 text-base text-heading" />
        </div>
      )}

      <Actions href={href} addDateHref={interview.at === null ? addDateHref(app.id, interview.id) : null} prepNotes={Boolean(prepNotes)} dashboard={dashboard} />
    </section>
  );
}

/** How far off the Interview is, "in 2 days", or "date TBD" for an Unscheduled one (BIG-221). */
function WhenOff({ at }: { at: string | null }) {
  return at === null ? <>date TBD</> : <DaysFromToday date={at} />;
}

/**
 * The line beside the category: the day and time, with the company and role first on the dashboard.
 * An Unscheduled Interview has no day and time, so only the dashboard's part, or nothing.
 */
function Where({ app, at, dashboard }: { app: Application; at: string | null; dashboard: boolean }) {
  const parts = [dashboard && `${app.company} · ${app.title}`, at !== null && <InterviewDayTime key="when" at={at} weekday="long" />].filter(Boolean);
  if (parts.length === 0) return null;
  return <span className="min-w-0">{parts.flatMap((part, i) => (i > 0 ? [" · ", part] : [part]))}</span>;
}

/**
 * The card's buttons: Add the date for an Unscheduled Interview (`addDateHref`, BIG-221), which
 * opens Edit details on its page; Add Prep notes while it has none; and on a phone, Open Interview.
 * One brand button per page (BIG-240): Add the date is brand on the Application page, but the
 * dashboard's is Add Application, so there every button here is secondary, and Add Prep notes always
 * is.
 *
 * On a phone they share one row, splitting it equally, two to a row (BIG-254): of three, Open
 * Interview takes the row below, and a lone one keeps its own width. Their icons give way to the
 * label there, and a label too long for its half shortens (`ButtonLabel`).
 */
function Actions({
  href,
  addDateHref,
  prepNotes,
  dashboard,
}: {
  href: string;
  addDateHref: string | null;
  prepNotes: boolean;
  dashboard: boolean;
}) {
  const onAPhone = (addDateHref ? 1 : 0) + (prepNotes ? 0 : 1) + 1;
  const openWidth = onAPhone === 1 ? "col-span-2 justify-self-start" : onAPhone === 3 ? "col-span-2" : "";
  return (
    <div className="@container grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
      {addDateHref && (
        <Link href={addDateHref} aria-label="Add the date" className={buttonClasses(dashboard ? "secondary" : "brand")}>
          <CalendarPlus className="size-4 max-sm:hidden" aria-hidden />
          <ButtonLabel full="Add the date" short="Date" />
        </Link>
      )}
      {!prepNotes && (
        <>
          <Link href={href} aria-label="Add Prep notes" className={buttonClasses("secondary")}>
            <Plus className="size-4 max-sm:hidden" aria-hidden />
            <ButtonLabel full="Add Prep notes" short="Prep notes" />
          </Link>
          <span className="hidden text-sm text-body sm:inline">No Prep notes yet.</span>
        </>
      )}
      <Link href={href} aria-label="Open Interview" className={`${buttonClasses("secondary")} ${openWidth} sm:hidden`}>
        {onAPhone === 2 ? <ButtonLabel full="Open Interview" short="Open" /> : "Open Interview"}
      </Link>
    </div>
  );
}

/**
 * The label of a button sharing a phone's row: the full one, or the short one where half the row is
 * too narrow for it (BIG-254). Under 18rem, as on 375 px and 320 px phones, "Add Prep notes"
 * (101 px) no longer fits its half, and both halves shorten together. The button's `aria-label`
 * keeps the full name either way.
 */
function ButtonLabel({ full, short }: { full: string; short: string }) {
  return (
    <>
      <span className="@max-[18rem]:hidden">{full}</span>
      <span className="hidden @max-[18rem]:inline">{short}</span>
    </>
  );
}
