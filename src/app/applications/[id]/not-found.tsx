import type { Metadata } from "next";
import { Suspense } from "react";
import { NOT_FOUND_TITLE } from "@/features/applications/application-not-found";
import { ApplicationNotFoundPage } from "@/features/applications/application-page";
import { getApplications } from "@/lib/api";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: `${NOT_FOUND_TITLE} · Bigfoot`,
};

/** Shown for a deleted Application, a malformed id and another job seeker's Application alike. */
export default function NotFound() {
  return (
    <Suspense fallback={<ApplicationNotFoundPage applications={[]} />}>
      <Loaded />
    </Suspense>
  );
}

async function Loaded() {
  const user = await getCurrentUser();
  const applications = await getApplications(user.id);
  return (
    <ApplicationNotFoundPage user={user} applications={applications.map(({ id, company, title }) => ({ id, company, title }))} />
  );
}
