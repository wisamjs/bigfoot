import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { InterviewEditor } from "@/features/applications/interview-editor";
import { OUTCOME_TONE } from "@/features/applications/status-tone";
import { AppHeader } from "@/features/shell/app-header";
import { FormPage } from "@/features/shell/form-page";
import { getApplications } from "@/lib/api";
import { INTERVIEW_OPTIONS, OUTCOME_OPTIONS, STATUS_OPTIONS, type Application } from "@/lib/applications";
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
      header={<AppHeader user={user} current="/dashboard" />}
      title={app.company}
      subtitle={`${app.title} · ${INTERVIEW_OPTIONS[interview.kind].label} Interview`}
      badge={<DoneBadge app={app} />}
    >
      <InterviewEditor app={app} interview={interview} />
    </FormPage>
  );
}

/** "Done · Rejected" once the Application is Done; nothing while it is In Progress. */
function DoneBadge({ app }: { app: Application }) {
  if (!app.outcome) return null;
  return (
    <Badge tone={OUTCOME_TONE[app.outcome]}>
      {`${STATUS_OPTIONS[app.status].label} · ${OUTCOME_OPTIONS[app.outcome].label}`}
    </Badge>
  );
}
