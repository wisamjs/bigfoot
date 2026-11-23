"use client";

import { ApplicationHeader } from "@/features/applications/application-header";
import { DetailsCard } from "@/features/applications/details-form";
import { InterviewList } from "@/features/applications/interview-list";
import { InterviewProgress } from "@/features/applications/interview-progress";
import { NextInterviewCard } from "@/features/applications/next-interview-card";
import { RememberViewed } from "@/features/applications/recently-viewed";
import { interviewSections, type Application } from "@/lib/applications";

/**
 * The Application page under its "← Dashboard" link (BIG-174): the heading (company, role,
 * Progress, Mark done… and ⋯ with Delete application), the Interviews as a strip, then the next
 * Interview's card and the Interviews card beside the Details card on wide screens, Details last
 * on narrow ones. Each Interview opens its Interview page, where it is edited.
 * `justAdded` is set when the page opens straight after adding the Application: the Interviews
 * card then prompts for its first Interview.
 * Leaving with a detail typed but not saved asks first: the page puts this inside UnsavedChanges.
 */
export function ApplicationEditor({ app, justAdded = false }: { app: Application; justAdded?: boolean }) {
  const { next, later, done } = interviewSections(app);
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <RememberViewed id={app.id} />
      <ApplicationHeader app={app} />
      <InterviewProgress app={app} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {next && <NextInterviewCard app={app} interview={next} />}
          <InterviewList app={app} later={later} done={done} justAdded={justAdded} />
        </div>
        <DetailsCard app={app} />
      </div>
    </div>
  );
}
