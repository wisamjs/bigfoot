import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { ApplicationNotFound, NOT_FOUND_TITLE } from "@/features/applications/application-not-found";
import { AppFooter } from "@/features/shell/app-footer";
import { AppHeader } from "@/features/shell/app-header";
import { getApplications } from "@/lib/api";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: `${NOT_FOUND_TITLE} · Bigfoot`,
};

/** Shown for a deleted Application, a malformed id and another job seeker's Application alike. */
export default function ApplicationNotFoundPage() {
  return (
    <Suspense fallback={<Layout header={<AppHeader current="/dashboard" />} applications={[]} />}>
      <NotFound />
    </Suspense>
  );
}

async function NotFound() {
  const user = await getCurrentUser();
  const applications = await getApplications(user.id);
  return (
    <Layout
      header={<AppHeader user={user} current="/dashboard" />}
      applications={applications.map(({ id, company, title }) => ({ id, company, title }))}
    />
  );
}

function Layout({ header, applications }: { header: React.ReactNode; applications: { id: string; company: string; title: string }[] }) {
  return (
    <>
      {header}
      <main id="main" className="py-12">
        <Container>
          <ApplicationNotFound applications={applications} />
        </Container>
      </main>
      <AppFooter />
    </>
  );
}
