"use client";

import { Ellipsis } from "lucide-react";
import { useState } from "react";
import { updateApplicationAction } from "@/app/applications/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SaveStatus } from "@/components/ui/save-status";
import { useSaveStatus } from "@/hooks/use-save-status";
import { OUTCOME_OPTIONS, OUTCOMES, type Application, type Outcome, type Status } from "@/lib/applications";

/** What a pick saves: the Status and Outcome the Application ends up with. */
export type StatusChange = { status: Status; outcome: Outcome | null };

/**
 * A row's one menu: "Mark <Outcome>" for each Outcome (not the one it already has) and, on a
 * Done Application, "Reopen". Picking one saves at once; the save's status shows beside the button
 * and `onChanged` hears what changed once it lands, so the list can announce the move and focus the
 * row. It sits after the row's stretched link in the DOM, above the link's cover, and outside it,
 * so opening it doesn't open the Application. Not modal: nothing else on the page is made inert
 * or aria-hidden for a menu a keyboard user can Tab out of.
 */
export function ChangeStatusMenu({
  app,
  onChanged,
}: {
  app: Application;
  onChanged: (app: Application, change: StatusChange) => void;
}) {
  const tracker = useSaveStatus();
  // The menu opens inside the card, so it's inside the page's main landmark, not at the end of <body>.
  const [container, setContainer] = useState<HTMLElement | null>(null);

  async function change(change: StatusChange) {
    const result = await tracker.run(() => updateApplicationAction(app.id, change));
    if (result.ok) onChanged(app, change);
  }

  return (
    <div ref={setContainer} className="relative z-10 flex items-center justify-end gap-2">
      <SaveStatus status={tracker.status} label={`Status, ${app.company}`} onRetry={tracker.retry} />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="tertiary" size="sm" className="px-2 pointer-coarse:min-h-11 pointer-coarse:min-w-11" aria-label={`Change Status, ${app.company}`}>
            <Ellipsis className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" container={container}>
          {OUTCOMES.filter((outcome) => outcome !== app.outcome).map((outcome) => (
            <DropdownMenuItem key={outcome} onSelect={() => void change({ status: "done", outcome })}>
              Mark {OUTCOME_OPTIONS[outcome].label}
            </DropdownMenuItem>
          ))}
          {app.status === "done" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void change({ status: "in_progress", outcome: null })}>
                Reopen
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** What the list says, and screen readers hear, once a card has changed: "Acme marked Rejected". */
export function changeMessage(app: Application, change: StatusChange) {
  return change.outcome ? `${app.company} marked ${OUTCOME_OPTIONS[change.outcome].label}` : `${app.company} reopened`;
}
