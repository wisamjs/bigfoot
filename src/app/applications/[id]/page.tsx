import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ApplicationEditor } from "@/features/applications/application-editor";
import { AppHeader } from "@/features/shell/app-header";
import { FormPage } from "@/features/shell/form-page";
import { ADDED_PARAM } from "@/features/applications/routes";
import { getApplications } from "@/lib/api";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Application · Bigfoot",
};

export default function ApplicationPage({ params, searchParams }: PageProps<"/applications/[id]">) {
  return (
    <Suspense fallback={<FormPage header={<AppHeader current="/dashboard" />} title="Application" />}>
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
  return (
    <FormPage header={<AppHeader user={user} current="/dashboard" />} title={app.company} subtitle={app.title}>
      <ApplicationEditor app={app} justAdded={query[ADDED_PARAM] === "1"} />
    </FormPage>
  );
}
