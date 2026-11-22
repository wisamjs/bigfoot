"use client";

import { CalendarClock } from "lucide-react";
import { StatCard } from "@/components/ui/statCard";
import { useIsClient } from "@/hooks/useIsClient";
import { INTERVIEW_OPTIONS, type DatedInterview } from "@/lib/applications";

const whenFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/** The soonest upcoming Interview. The date waits for hydration: the server doesn't know the viewer's time zone. */
export function NextInterviewStat({ next }: { next: DatedInterview | null }) {
  const isClient = useIsClient();
  if (!next) return <StatCard icon={CalendarClock} label="Next Interview" value="None yet" />;
  const kind = INTERVIEW_OPTIONS[next.interview.kind].label;
  return (
    <StatCard
      icon={CalendarClock}
      label="Next Interview"
      value={next.application.company}
      note={isClient ? `${kind}, ${whenFormat.format(new Date(next.interview.at))}` : kind}
    />
  );
}
