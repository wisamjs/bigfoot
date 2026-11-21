"use client";

import { Plus } from "lucide-react";
import { createInterviewAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { SaveStatus } from "@/components/ui/save-status";
import { useSaveStatus } from "@/hooks/use-save-status";
import { InterviewRow } from "@/features/applications/interview-row";
import type { Application } from "@/lib/applications";

/** An Application's Interviews, each editable in its own row, and Add Interview. */
export function InterviewList({ app }: { app: Application }) {
  const addInterview = useSaveStatus();

  return (
    <section aria-labelledby="interviews-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 id="interviews-title" className="m-0 text-base font-bold leading-[1.25] text-heading">
          Interviews
        </h3>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <SaveStatus
            status={addInterview.status}
            label="New Interview"
            savingText="Adding…"
            savedText="Added"
            onRetry={addInterview.retry}
          />
          <Button
            disabled={addInterview.saving}
            onClick={() => void addInterview.run(() => createInterviewAction(app.id, { kind: "informal_chat" }))}
            variant="secondary"
            size="sm"
          >
            <Plus className="size-4" aria-hidden />
            Add Interview
          </Button>
        </div>
      </div>
      {app.interviews.length === 0 ? (
        <p className="m-0 text-sm text-body">No Interviews yet. Add one when you have a conversation lined up.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {app.interviews.map((interview, index) => (
            <InterviewRow key={interview.id} app={app} interview={interview} position={index + 1} />
          ))}
        </ul>
      )}
    </section>
  );
}
