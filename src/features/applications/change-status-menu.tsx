"use client";

import { Fragment } from "react";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { todayLocal } from "@/features/applications/local-datetime";
import { statusChoices, type StatusChange } from "@/features/applications/status-choices";
import type { Application } from "@/lib/applications";

export type { StatusChange };

/**
 * The Change Status choices (statusChoices), for a menu that holds them (the Application page's Mark
 * done… and ⋯). Picking one hands its change to `onPick`, which saves it.
 */
export function StatusMenuItems({ app, onPick }: { app: Application; onPick: (change: StatusChange) => void }) {
  return (
    <>
      {statusChoices(app, todayLocal()).map(({ label, change, separated }) => (
        <Fragment key={label}>
          {separated && <DropdownMenuSeparator />}
          <DropdownMenuItem onSelect={() => onPick(change)}>{label}</DropdownMenuItem>
        </Fragment>
      ))}
    </>
  );
}
