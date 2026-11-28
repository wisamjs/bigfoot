import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplicationsPage, ApplicationsPageSkeleton } from "@/features/applications/applications-page";
import { getApplications } from "@/lib/api";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Applications · Bigfoot",
};

// The Progress filter and sort (`?progress=waiting&sort=next`) are read in the browser
// (useApplicationsView), so the page doesn't wait on searchParams.
export default function Page() {
  return (
    <Suspense fallback={<ApplicationsPageSkeleton />}>
      <Applications />
    </Suspense>
  );
}

async function Applications() {
  const user = await getCurrentUser();
  const applications = await getApplications(user.id);
  return <ApplicationsPage user={user} applications={applications} />;
}
