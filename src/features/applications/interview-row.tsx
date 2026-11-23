"use client";

import { Trash2 } from "lucide-react";
import { InterviewFields } from "@/features/applications/interview-fields";
import { INTERVIEW_OPTIONS, type Application, type Interview } from "@/lib/applications";

/** The id of an Interview's delete button, which the list focuses when a neighbour is deleted. */
export const deleteButtonId = (interviewId: string) => `delete-interview-${interviewId}`;

/**
 * One Interview on its Application page: its fields (InterviewFields), with Delete beside the date.
 * The list keys this row by the Interview.
 */
export function InterviewRow({
  app,
  interview,
  position,
  onDelete,
}: {
  app: Application;
  interview: Interview;
  /** 1 for the Application's first Interview. */
  position: number;
  /** Asks to delete this Interview: the list shows the confirmation, because the row goes with it. */
  onDelete: () => void;
}) {
  const label = `Interview ${position}`;
  const kindLabel = INTERVIEW_OPTIONS[interview.kind].label;
  return (
    <li className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-3">
      <InterviewFields
        app={app}
        interview={interview}
        label={label}
        actions={
          <button
            type="button"
            id={deleteButtonId(interview.id)}
            onClick={onDelete}
            aria-label={`Delete ${kindLabel} Interview, ${label}`}
            className="touch-target rounded-control p-2.5 text-body transition-colors hover:bg-danger-soft hover:text-fg-danger"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        }
      />
    </li>
  );
}
