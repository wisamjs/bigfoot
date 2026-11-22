import type { Metadata } from "next";
import { Suspense } from "react";
import { NewApplicationForm } from "@/features/applications/newApplicationForm";
import { AppHeader } from "@/features/shell/appHeader";
import { FormPage } from "@/features/shell/formPage";
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
