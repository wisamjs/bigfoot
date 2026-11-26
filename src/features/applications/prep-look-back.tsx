"use client";

import { ArrowRight, Lightbulb } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { ShortDay } from "@/features/applications/application-when";
import { interviewHref } from "@/features/applications/routes";
import { useToday } from "@/hooks/use-today";
import {
  calendarDaysBetween,
  categoryLabel,
  relativeDays,
  roundTitle,
  type PrepLookBack as LookBack,
  type PrepTakeaway,
} from "@/lib/applications";

/**
 * What an upcoming Interview's prep looks back at (BIG-181), on its Interview page's Prep notes
 * card and its Application page's Next up card: up to two takeaways, each in a box with a
 * lightbulb and where it came from ("Takeaway from Hiring Manager · Nov 13", "From your last
 * Hiring Manager · Lumen Bio"), then They asked last time. Nothing when there is neither.
 */
export function PrepLookBack({ lookBack }: { lookBack: LookBack }) {
  const { takeaways, theyAsked } = lookBack;
  if (takeaways.length === 0 && !theyAsked) return null;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {takeaways.length > 0 && (
        <ul aria-label="Takeaways for this Interview" className="m-0 flex list-none flex-col gap-3 p-0">
          {takeaways.map((takeaway) => (
            <TakeawayBox key={takeaway.rule} takeaway={takeaway} />
          ))}
        </ul>
      )}
      {theyAsked && <TheyAskedLastTime questions={theyAsked.questions} />}
    </div>
  );
}

/**
 * One takeaway in its box: where it came from, then the takeaway. One from this Application names
 * its Interview by title; one from elsewhere by the category they share: "From your last Hiring
 * Manager · Lumen Bio".
 */
function TakeawayBox({ takeaway: { rule, application, interview } }: { takeaway: PrepTakeaway }) {
  return (
    <li className="flex min-w-0 gap-3 rounded-card bg-surface p-4">
      <Lightbulb className="mt-0.5 size-5 shrink-0 text-fg-brand" aria-hidden />
      <div className="min-w-0">
        <p className="m-0 text-sm text-body">
          {rule === "same_application" ? (
            <>
              Takeaway from {interview.title}
              <Dot />
              <ShortDay at={interview.at} />
            </>
          ) : (
            <>
              From your last {categoryLabel(interview.category)}
              <Dot />
              {application.company}
            </>
          )}
        </p>
        <p className="m-0 mt-1 break-words text-base text-heading">{interview.takeaway}</p>
      </div>
    </li>
  );
}

function Dot() {
  return <span aria-hidden> · </span>;
}

/** What they asked at the Application's latest completed Interview, as a list. */
function TheyAskedLastTime({ questions }: { questions: string[] }) {
  const headingId = useId();
  // Keyed by their text, numbered when one repeats.
  const seen = new Map<string, number>();
  const items = questions.map((text) => {
    const count = (seen.get(text) ?? 0) + 1;
    seen.set(text, count);
    return { text, key: `${count}:${text}` };
  });
  return (
    <div className="min-w-0 rounded-card bg-surface p-4">
      <h3 id={headingId} className="m-0 text-sm font-normal text-body">
        They asked last time
      </h3>
      <ul aria-labelledby={headingId} className="m-0 mt-2 flex list-disc flex-col gap-1 pl-5 text-base text-heading">
        {items.map((item) => (
          <li key={item.key} className="break-words">
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Where a completed Interview's Takeaway for next time shows (BIG-181), one link per upcoming
 * Interview, to its page: "Shows on Round 3 · Technical Deep-Dive, in 2 days →" (the next
 * Interview of this Application) and "Shows on your next Hiring Manager: Tilth Agritech,
 * tomorrow →" (the next of the same category elsewhere, BIG-202). Nothing when neither exists yet.
 */
export function TakeawayShowsOn({ showsOn }: { showsOn: PrepTakeaway[] }) {
  const today = useToday();
  if (showsOn.length === 0) return null;
  return (
    <ul aria-label="Shows on" className="m-0 mt-3 flex list-none flex-col gap-1 p-0 text-sm leading-[1.4]">
      {showsOn.map(({ rule, application, interview, round }) => {
        const when = today ? relativeDays(calendarDaysBetween(today, new Date(interview.at))) : null;
        return (
          <li key={rule}>
            <Link
              href={interviewHref(application.id, interview.id)}
              // Left-aligned, the arrow inline after the last word, however the text wraps.
              className="touch-target justify-start rounded-control text-left text-sm font-medium text-fg-brand transition-colors hover:text-fg-brand-strong"
            >
              <span className="break-words">
                {rule === "same_application"
                  ? `Shows on ${roundTitle(round, interview.title)}${when ? `, ${when}` : ""}`
                  : `Shows on your next ${categoryLabel(interview.category)}: ${application.company}${when ? `, ${when}` : ""}`}
                <ArrowRight className="ml-1 inline size-4 align-[-0.2em]" aria-hidden />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
