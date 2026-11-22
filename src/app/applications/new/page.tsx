import type { Metadata } from "next";
import { Suspense } from "react";
import { NewApplicationForm } from "@/features/applications/new-application-form";
import { AppHeader } from "@/features/shell/app-header";
import { FormPage } from "@/features/shell/form-page";
import { getCurrentUser } from "@/lib/dal";

const TITLE = "Add Application";

export const metadata: Metadata = {
  title: `${TITLE} · Bigfoot`,
};

export default function NewApplicationPage() {
  return (
    <Suspense fallback={<FormPage header={<AppHeader current="/dashboard" />} title={TITLE} />}>
      <NewApplication />
    </Suspense>
  );
}

async function NewApplication() {
  const user = await getCurrentUser();
  return (
    <FormPage header={<AppHeader user={user} current="/dashboard" />} title={TITLE}>
      <NewApplicationForm />
    </FormPage>
  );
}
