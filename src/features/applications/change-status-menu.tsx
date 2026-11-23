"use client";

import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { OUTCOME_OPTIONS, OUTCOMES, type Application, type Outcome, type Status } from "@/lib/applications";

/** What a pick saves: the Status and Outcome the Application ends up with. */
export type StatusChange = { status: Status; outcome: Outcome | null };

/**
 * The Change Status choices, for a menu that holds them (the Application page's Mark done… and ⋯):
 * "Mark <Outcome>" for each Outcome the Application doesn't already have and, once it's Done,
 * "Reopen". Picking one hands its change to `onPick`, which saves it.
 */
export function StatusMenuItems({ app, onPick }: { app: Application; onPick: (change: StatusChange) => void }) {
  return (
    <>
      {OUTCOMES.filter((outcome) => outcome !== app.outcome).map((outcome) => (
        <DropdownMenuItem key={outcome} onSelect={() => onPick({ status: "done", outcome })}>
          Mark {OUTCOME_OPTIONS[outcome].label}
        </DropdownMenuItem>
      ))}
      {app.status === "done" && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onPick({ status: "in_progress", outcome: null })}>Reopen</DropdownMenuItem>
        </>
      )}
    </>
  );
}
