import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/features/shell/appHeader";
import { FormPage } from "@/features/shell/formPage";
import { getCurrentUser } from "@/lib/dal";

const TITLE = "Application not found";

export const metadata: Metadata = {
  title: `${TITLE} · Bigfoot`,
};

/** Shown for a deleted Application, a malformed id and another job seeker's Application alike. */
export default function ApplicationNotFound() {
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
        It may have been deleted, or the link may be wrong. Go back to the Dashboard to find it.
      </p>
    </FormPage>
  );
}
