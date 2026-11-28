import { InterviewEditor } from "@/features/applications/interview-editor";
import { applicationHref } from "@/features/applications/routes";
import { UnsavedChanges } from "@/features/applications/unsaved-changes";
import { AppHeader } from "@/features/shell/app-header";
import { DashboardBreadcrumb } from "@/features/shell/dashboard-link";
import { FormPage, TitleBlock } from "@/features/shell/form-page";
import { QuestionSignBigfoot } from "@/features/shell/illustrations";
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
 * only what shows reaches the browser. `editDetails` opens Edit details at once (Add the date).
 */
export function InterviewPage({
  user,
  app,
  interview,
  lookBack,
  showsOn,
  editDetails = false,
}: {
  user: CurrentUser;
  app: Application;
  interview: Interview;
  lookBack: PrepLookBack | undefined;
  showsOn: PrepTakeaway[];
  editDetails?: boolean;
}) {
  return (
    <FormPage
      wide
      header={<AppHeader user={user} current="/dashboard" />}
      title={app.company}
      back={<DashboardBreadcrumb href={applicationHref(app.id)}>{app.company}</DashboardBreadcrumb>}
      guard={UnsavedChanges}
    >
      <InterviewEditor app={app} interview={interview} lookBack={lookBack} showsOn={showsOn} editDetails={editDetails} />
    </FormPage>
  );
}

export function InterviewPageSkeleton() {
  return <FormPage header={<AppHeader current="/dashboard" />} title="Interview" />;
}

/**
 * Shown for a deleted Interview, a malformed id and another job seeker's Interview alike; without a `user` it is the loading state.
 * Bigfoot stands right of the title, his feet behind the card's top edge (BIG-228): out of the flow, so
 * nothing moves, and clipped at that edge, so the card draws over his feet. Smaller on a phone, where
 * the title keeps room for him at its right.
 */
export function InterviewNotFoundPage({ user }: { user?: CurrentUser }) {
  return (
    <FormPage
      header={<AppHeader user={user} current="/dashboard" />}
      title={INTERVIEW_NOT_FOUND_TITLE}
      heading={<TitleBlock title={INTERVIEW_NOT_FOUND_TITLE} className="max-sm:pr-26" />}
    >
      {user && (
        <div className="relative">
          {/* The card's border and padding are 25px: the box ends 8px below the card's top edge, and those 8px are clipped. */}
          <QuestionSignBigfoot className="pointer-events-none absolute -right-1 bottom-[calc(100%+17px)] h-auto w-20 [clip-path:inset(0_0_8px_0)] sm:w-[136px]" />
          <p className="m-0 text-base leading-[1.625] text-body">
            This Interview doesn’t exist or has been deleted. Go back to the Dashboard to find your Interviews.
          </p>
        </div>
      )}
    </FormPage>
  );
}
