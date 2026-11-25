"use client";

import { Lightbulb } from "lucide-react";
import { useIsClient } from "@/hooks/use-is-client";
import {
  OUTCOME_OPTIONS,
  outcomeSummary,
  parseDay,
  takeaways,
  type Application,
} from "@/lib/applications";

// The card leaves out the year, as the Application page's Interviews do.
const dayFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

/**
 * A Done Application's Outcome card (BIG-182), above its Interviews card: "Outcome · Nov 16" (its
 * Done date, when it has one), the Outcome as the heading, how it got there ("After 2 Interviews, 27
 * days from applying.") and the Outcome note in quotes. Under them, "What you're taking from it":
 * the Takeaway for next time of each of its Interviews that has one, newest first, each naming its
 * Interview ("From Hiring Manager · Nov 12"); left out when none has one.
 */
export function OutcomeCard({ app }: { app: Application }) {
  const isClient = useIsClient();
  const taken = takeaways(app);
  if (!app.outcome) return null;
  return (
    <section aria-labelledby="outcome-title" className="card flex flex-col gap-5 p-5 sm:p-8">
      <div className="min-w-0">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-body">
          Outcome
          {app.done_on && (
            <>
              {" · "}
              <time dateTime={app.done_on}>{isClient ? dayFormat.format(parseDay(app.done_on)) : app.done_on}</time>
            </>
          )}
        </p>
        <h2 id="outcome-title" className="m-0 mt-1 break-words text-2xl font-bold leading-[1.2] text-heading">
          {OUTCOME_OPTIONS[app.outcome].label}
        </h2>
        <p className="m-0 mt-2 break-words text-base text-body">
          {outcomeSummary(app)}
          {app.outcome_note && (
            <>
              {" "}
              <q className="whitespace-pre-line text-heading">{app.outcome_note}</q>
            </>
          )}
        </p>
      </div>

      {taken.length > 0 && (
        <div className="rounded-card bg-surface p-4">
          <h3 className="m-0 text-sm font-medium text-body">What you’re taking from it</h3>
          <ul className="m-0 mt-3 flex list-none flex-col gap-4 p-0">
            {taken.map(({ from, text }) => (
              <li key={from.id} className="flex gap-3">
                <Lightbulb className="mt-0.5 size-5 shrink-0 text-fg-brand" aria-hidden />
                <div className="min-w-0">
                  <p className="m-0 break-words text-base text-heading">{text}</p>
                  <p className="m-0 mt-1 text-sm text-body">
                    From {from.title}
                    {isClient && ` · ${dayFormat.format(new Date(from.at))}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
