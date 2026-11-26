import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { InterviewEditor } from "@/features/applications/interview-editor";
import { applicationHref } from "@/features/applications/routes";
import { UnsavedChanges } from "@/features/applications/unsaved-changes";
import { AppHeader } from "@/features/shell/app-header";
import { DashboardBreadcrumb } from "@/features/shell/dashboard-link";
import { FormPage } from "@/features/shell/form-page";
import { getApplications } from "@/lib/api";
import { prepLookBack, takeawayShowsOn } from "@/lib/applications";
import { getCurrentUser } from "@/lib/dal";

type Props = PageProps<"/applications/[id]/interviews/[interviewId]">;

export const metadata: Metadata = {
  title: "Interview · Bigfoot",
};

export default function InterviewPage({ params }: Props) {
  return (
    <Suspense fallback={<FormPage header={<AppHeader current="/dashboard" />} title="Interview" />}>
      <InterviewPageBody params={params} />
    </Suspense>
  );
}

async function InterviewPageBody({ params }: Pick<Props, "params">) {
  const user = await getCurrentUser();
  const [{ id, interviewId }, applications] = await Promise.all([params, getApplications(user.id)]);
  // The API has no single-Interview read: find it among the job seeker's own Applications. A
  // deleted Interview, a malformed id and another job seeker's all come up empty, and look the same.
  const app = applications.find((a) => a.id === id);
  const interview = app?.interviews.find((i) => i.id === interviewId);
  if (!app || !interview) notFound();
  return (
    <FormPage
      wide
      header={<AppHeader user={user} current="/dashboard" />}
      title={app.company}
      // The Interview page belongs to its Application page, so "Dashboard / <company>" leads there (BIG-202).
      back={<DashboardBreadcrumb href={applicationHref(app.id)}>{app.company}</DashboardBreadcrumb>}
      guard={UnsavedChanges}
    >
      <InterviewEditor
        app={app}
        interview={interview}
        // Worked out here, from every Application, so only what shows reaches the browser.
        lookBack={interview.completed ? undefined : prepLookBack(applications, app, interview)}
        showsOn={takeawayShowsOn(applications, app, interview)}
      />
    </FormPage>
  );
}
