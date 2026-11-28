"use client";

import { ChevronDown, Ellipsis, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
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
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSaveStatus } from "@/hooks/use-save-status";
import { useToday } from "@/hooks/use-today";
import { DeleteApplicationDialog } from "@/features/applications/application-dialogs";
import { StatusMenuItems, type StatusChange } from "@/features/applications/change-status-menu";
import { SampleBadge } from "@/features/applications/sample-badge";
import { UNSCHEDULED_PILL } from "@/features/applications/status-tone";
import {
  applicationProgress,
  calendarDaysBetween,
  locationText,
  parseDay,
  type Application,
  type Progress,
} from "@/lib/applications";

/** The Progress badge's colours: its dot and its pill. */
const PROGRESS_TONE: Record<Progress["id"], { pill: string; dot: string }> = {
  waiting: { pill: "border-line-warning-subtle bg-warning-soft text-fg-warning", dot: "bg-fg-warning" },
  // Next round · date TBD (BIG-221): neutral, neither warning nor blue.
  unscheduled: UNSCHEDULED_PILL,
  scheduled: { pill: "border-tone-blue-line bg-tone-blue text-tone-blue-fg", dot: "bg-tone-blue-fg" },
  offer: { pill: "border-line-success-subtle bg-success-soft text-fg-success-strong", dot: "bg-fg-success-strong" },
  done: { pill: "border-tone-gray-line bg-tone-gray text-tone-gray-fg", dot: "bg-tone-gray-fg" },
};

/**
 * The Application page's heading (BIG-174): the company, its role and Location, and on the right
 * where it stands (its Progress badge), Mark done… (the Change Status choices) and ⋯, which holds
 * Delete application. On a phone, Mark done… folds into ⋯.
 */
export function ApplicationHeader({ app }: { app: Application }) {
  const tracker = useSaveStatus();
  const [deleting, setDeleting] = useState(false);
  const location = locationText(app);

  function change(picked: StatusChange) {
    void tracker.run(() => updateApplicationAction(app.id, picked));
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="m-0 break-words text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-heading md:text-[44px]">
          {app.company}
        </h1>
        <p className="m-0 mt-2 break-words text-base leading-[1.6] text-body md:text-lg">
          {app.title}
          {location && ` · ${location}`}
        </p>
        {app.is_sample && (
          <div className="mt-2">
            <SampleBadge />
          </div>
        )}
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
          <ProgressBadge app={app} />
          <div className="flex items-center gap-3">
            <MarkDoneMenu app={app} onPick={change} />
            <MoreMenu app={app} onPick={change} onDelete={() => setDeleting(true)} />
          </div>
        </div>
        <SaveStatus status={tracker.status} label="Status" onRetry={tracker.retry} />
      </div>
      <DeleteApplicationDialog app={app} open={deleting} onClose={() => setDeleting(false)} />
    </div>
  );
}

/** Where the Application stands, as a pill: "Waiting · 5 days", "Interview scheduled", "Offer", "Done · Rejected". */
export function ProgressBadge({ app }: { app: Application }) {
  const progress = applicationProgress(app);
  const tone = PROGRESS_TONE[progress.id];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${tone.pill}`}>
      <span aria-hidden className={`size-2 rounded-full ${tone.dot}`} />
      {progress.label}
      {progress.id === "waiting" && <WaitingDays since={app.waiting_since} />}
    </span>
  );
}

/** " · 5 days" of waiting, counted in the viewer's time zone once the page is in the browser. */
function WaitingDays({ since }: { since: string | null }) {
  const today = useToday();
  if (!since || !today) return null;
  const days = Math.max(0, calendarDaysBetween(parseDay(since), today));
  return <> · {days === 1 ? "1 day" : `${days} days`}</>;
}

/** "Mark done…" (or "Change Status…" once Done): the Change Status choices, on wide screens. */
function MarkDoneMenu({ app, onPick }: { app: Application; onPick: (change: StatusChange) => void }) {
  // The menu opens inside the page's main landmark, not at the end of <body>.
  const [container, setContainer] = useState<HTMLElement | null>(null);
  return (
    <div ref={setContainer} className="relative hidden sm:block">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">
            {app.status === "done" ? "Change Status…" : "Mark done…"}
            <ChevronDown className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" container={container}>
          <StatusMenuItems app={app} onPick={onPick} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** ⋯: Delete application, and on a phone the Change Status choices above it. */
function MoreMenu({
  app,
  onPick,
  onDelete,
}: {
  app: Application;
  onPick: (change: StatusChange) => void;
  onDelete: () => void;
}) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Only read while the menu is open, so the server's guess never shows.
  const wide = useMediaQuery("(min-width: 640px)");
  return (
    <div ref={setContainer} className="relative">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button ref={triggerRef} variant="secondary" className="px-3" aria-label={`More actions, ${app.company}`}>
            <Ellipsis className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" container={container}>
          {!wide && (
            <>
              <StatusMenuItems app={app} onPick={onPick} />
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              // The dialog returns focus to what had it when it opened: ⋯, not this item, which goes.
              triggerRef.current?.focus();
              onDelete();
            }}
          >
            <Trash2 aria-hidden />
            Delete application
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
