import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/features/shell/app-header";
import { FormPage } from "@/features/shell/form-page";
import { getCurrentUser } from "@/lib/dal";

const TITLE = "Interview not found";

export const metadata: Metadata = {
  title: `${TITLE} · Bigfoot`,
};

/** Shown for a deleted Interview, a malformed id and another job seeker's Interview alike. */
export default function InterviewNotFound() {
  return (
    <Suspense fallback={<FormPage header={<AppHeader current="/dashboard" />} title={TITLE} />}>
      <NotFound />
    </Suspense>
  );
}

async function NotFound() {
  const user = await getCurrentUser();
  return (
    <FormPage header={<AppHeader user={user} current="/dashboard" />} title={TITLE}>
      <p className="m-0 text-base leading-[1.625] text-body">
        This Interview doesn’t exist or has been deleted. Go back to the Dashboard to find your Interviews.
      </p>
    </FormPage>
  );
}
