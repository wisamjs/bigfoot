"use client";

import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { todayLocal } from "@/features/applications/local-datetime";
import { OUTCOME_OPTIONS, OUTCOMES, type Application, type Outcome, type Status } from "@/lib/applications";

/**
 * What a pick saves: the Status and Outcome the Application ends up with, and the Done date and
 * Outcome note that go with them. Marking an In Progress Application Done dates it today (the
 * viewer's today); Reopen clears both.
 */
export type StatusChange = { status: Status; outcome: Outcome | null; done_on?: string | null; outcome_note?: null };

/**
 * The Change Status choices, for a menu that holds them (the Application page's Mark done… and ⋯):
 * "Mark <Outcome>" for each Outcome the Application doesn't already have and, once it's Done,
 * "Reopen". Picking one hands its change to `onPick`, which saves it. Changing the Outcome of a
 * Done Application keeps its Done date.
 */
export function StatusMenuItems({ app, onPick }: { app: Application; onPick: (change: StatusChange) => void }) {
  const done = app.status === "done";
  // Applied for after today, it can't have ended today: then it gets no Done date.
  const markDone = (outcome: Outcome): StatusChange => {
    const today = todayLocal();
    return { status: "done", outcome, done_on: today >= app.applied_on ? today : null };
  };
  return (
    <>
      {OUTCOMES.filter((outcome) => outcome !== app.outcome).map((outcome) => (
        <DropdownMenuItem
          key={outcome}
          onSelect={() => onPick(done ? { status: "done", outcome } : markDone(outcome))}
        >
          Mark {OUTCOME_OPTIONS[outcome].label}
        </DropdownMenuItem>
      ))}
      {done && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => onPick({ status: "in_progress", outcome: null, done_on: null, outcome_note: null })}
          >
            Reopen
          </DropdownMenuItem>
        </>
      )}
    </>
  );
}
