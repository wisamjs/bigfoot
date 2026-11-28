import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { InterviewPage, InterviewPageSkeleton } from "@/features/applications/interview-page";
import { EDIT_PARAM, prefetchHrefs } from "@/features/applications/routes";
import { PrefetchRoutes } from "@/features/shell/prefetch-routes";
import { getApplications } from "@/lib/api";
import { isAbandoned, prepLookBack, takeawayShowsOn } from "@/lib/applications";
import { getCurrentUser } from "@/lib/dal";

type Props = PageProps<"/applications/[id]/interviews/[interviewId]">;

export const metadata: Metadata = {
  title: "Interview · Bigfoot",
};

export default function Page({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<InterviewPageSkeleton />}>
      <InterviewPageBody params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function InterviewPageBody({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const user = await getCurrentUser();
  const [{ id, interviewId }, search, applications] = await Promise.all([params, searchParams, getApplications(user.id)]);
  // The API has no single-Interview read: find it among the job seeker's own Applications. A
  // deleted Interview, a malformed id and another job seeker's all come up empty, and look the same.
  const app = applications.find((a) => a.id === id);
  const interview = app?.interviews.find((i) => i.id === interviewId);
  if (!app || !interview) notFound();
  return (
    <>
      <InterviewPage
        user={user}
        app={app}
        interview={interview}
        // Worked out here, from every Application, so only what shows reaches the browser.
        // An Interview that is over, completed or Abandoned, has no prep still to come.
        lookBack={interview.completed || isAbandoned(app, interview) ? undefined : prepLookBack(applications, app, interview)}
        showsOn={takeawayShowsOn(applications, app, interview)}
        // Add the date on the Application page: Edit details opens at once.
        editDetails={search[EDIT_PARAM] === "details"}
      />
      {/* The other Rounds, latest first, then the Application page, also after a save expires them. */}
      <PrefetchRoutes hrefs={prefetchHrefs(app, interview.id)} />
    </>
  );
}
