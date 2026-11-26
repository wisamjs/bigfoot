import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ApplicationPage, ApplicationPageSkeleton } from "@/features/applications/application-page";
import { ADDED_PARAM } from "@/features/applications/routes";
import { getApplications } from "@/lib/api";
import { nextInterview, prepLookBack } from "@/lib/applications";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Application · Bigfoot",
};

export default function Page({ params, searchParams }: PageProps<"/applications/[id]">) {
  return (
    <Suspense fallback={<ApplicationPageSkeleton />}>
      <Application params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Application({ params, searchParams }: Pick<PageProps<"/applications/[id]">, "params" | "searchParams">) {
  const user = await getCurrentUser();
  const [{ id }, query, applications] = await Promise.all([params, searchParams, getApplications(user.id)]);
  // The API has no single-Application read: find it among the job seeker's own. A deleted
  // Application, a malformed id and another job seeker's all come up empty, and look the same.
  const app = applications.find((a) => a.id === id);
  if (!app) notFound();
  const next = nextInterview(app);
  return (
    <ApplicationPage
      user={user}
      app={app}
      justAdded={query[ADDED_PARAM] === "1"}
      // Worked out here, from every Application, so only what shows reaches the browser.
      lookBack={next ? prepLookBack(applications, app, next) : undefined}
    />
  );
}
