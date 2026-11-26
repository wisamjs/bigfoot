import { InterviewEditor } from "@/features/applications/interview-editor";
import { applicationHref } from "@/features/applications/routes";
import { UnsavedChanges } from "@/features/applications/unsaved-changes";
import { AppHeader } from "@/features/shell/app-header";
import { DashboardBreadcrumb } from "@/features/shell/dashboard-link";
import { FormPage } from "@/features/shell/form-page";
import type { Application, Interview, PrepLookBack, PrepTakeaway } from "@/lib/applications";
import type { CurrentUser } from "@/lib/current-user";

// An Interview's page (/applications/[id]/interviews/[interviewId]), its loading state and its
// not-found page. The routes load the data and work out the look back and where its takeaway
// shows; the Pages/Interview stories pass fixed ones (BIG-203).

export const INTERVIEW_NOT_FOUND_TITLE = "Interview not found";

/**
 * The Interview page, under "Dashboard / <company>", which leads to its Application page (BIG-202).
 * `lookBack` (an upcoming Interview's takeaways and They asked last time) and `showsOn` (the
 * Interviews its Takeaway for next time shows before) are worked out from every Application, so
 * only what shows reaches the browser.
 */
export function InterviewPage({
  user,
  app,
  interview,
  lookBack,
  showsOn,
}: {
  user: CurrentUser;
  app: Application;
  interview: Interview;
  lookBack: PrepLookBack | undefined;
  showsOn: PrepTakeaway[];
}) {
  return (
    <FormPage
      wide
      header={<AppHeader user={user} current="/dashboard" />}
      title={app.company}
      back={<DashboardBreadcrumb href={applicationHref(app.id)}>{app.company}</DashboardBreadcrumb>}
      guard={UnsavedChanges}
    >
      <InterviewEditor app={app} interview={interview} lookBack={lookBack} showsOn={showsOn} />
    </FormPage>
  );
}

export function InterviewPageSkeleton() {
  return <FormPage header={<AppHeader current="/dashboard" />} title="Interview" />;
}

/** Shown for a deleted Interview, a malformed id and another job seeker's Interview alike; without a `user` it is the loading state. */
export function InterviewNotFoundPage({ user }: { user?: CurrentUser }) {
  return (
    <FormPage header={<AppHeader user={user} current="/dashboard" />} title={INTERVIEW_NOT_FOUND_TITLE}>
      {user && (
        <p className="m-0 text-base leading-[1.625] text-body">
          This Interview doesn’t exist or has been deleted. Go back to the Dashboard to find your Interviews.
        </p>
      )}
    </FormPage>
  );
}
