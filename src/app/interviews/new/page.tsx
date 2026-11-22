import type { Metadata } from "next";
import { Suspense } from "react";
import { NewInterviewForm } from "@/features/applications/newInterviewForm";
import { APPLICATION_PARAM } from "@/features/applications/routes";
import { AppHeader } from "@/features/shell/appHeader";
import { FormPage } from "@/features/shell/formPage";
import { listApplications } from "@/lib/api";
import { getCurrentUser } from "@/lib/dal";

const TITLE = "Add Interview";

export const metadata: Metadata = {
  title: `${TITLE} · Bigfoot`,
};

export default function NewInterviewPage({ searchParams }: PageProps<"/interviews/new">) {
  return (
    <Suspense fallback={<FormPage header={<AppHeader current="/dashboard" />} title={TITLE} />}>
      <NewInterview searchParams={searchParams} />
    </Suspense>
  );
}

async function NewInterview({ searchParams }: Pick<PageProps<"/interviews/new">, "searchParams">) {
  const user = await getCurrentUser();
  const [applications, params] = await Promise.all([listApplications(user.id), searchParams]);
  // An Application page's Add Interview chooses its Application; an id that isn't one of theirs chooses none.
  const chosen = params[APPLICATION_PARAM];
  const applicationId = applications.some((app) => app.id === chosen) ? (chosen as string) : "";
  return (
    <FormPage header={<AppHeader user={user} current="/dashboard" />} title={TITLE}>
      <NewInterviewForm applications={applications} applicationId={applicationId} />
    </FormPage>
  );
}
