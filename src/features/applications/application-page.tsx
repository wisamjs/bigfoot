import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { ApplicationEditor } from "@/features/applications/application-editor";
import { ApplicationNotFound } from "@/features/applications/application-not-found";
import { DeletedNotice } from "@/features/applications/deleted-notice";
import { UnsavedChanges } from "@/features/applications/unsaved-changes";
import { AppFooter } from "@/features/shell/app-footer";
import { AppHeader } from "@/features/shell/app-header";
import { ApplicationsBackLink } from "@/features/shell/back-links";
import { FormPage } from "@/features/shell/form-page";
import type { Application, PrepLookBack } from "@/lib/applications";
import type { CurrentUser } from "@/lib/current-user";

// An Application's page (/applications/[id]), its loading state and its not-found page. The routes
// load the data and work out the Next up card's look back; the Pages/Application stories pass
// fixed ones (BIG-203).

/**
 * The Application page. `justAdded` is the Add Application form's `?added=1`; `lookBack` is the
 * next Interview's takeaways and They asked last time, worked out from every Application so only
 * what shows reaches the browser.
 */
export function ApplicationPage({
  user,
  app,
  justAdded,
  lookBack,
}: {
  user: CurrentUser;
  app: Application;
  justAdded: boolean;
  lookBack: PrepLookBack | undefined;
}) {
  return (
    <FormPage
      header={<AppHeader user={user} current="/applications" />}
      title={app.company}
      back={<ApplicationsBackLink />}
      notice={<DeletedNotice />}
      guard={UnsavedChanges}
      wide
    >
      <ApplicationEditor app={app} justAdded={justAdded} lookBack={lookBack} />
    </FormPage>
  );
}

export function ApplicationPageSkeleton() {
  return <FormPage header={<AppHeader current="/applications" />} title="Application" back={<ApplicationsBackLink />} wide />;
}

/**
 * Shown for a deleted Application, a malformed id and another job seeker's Application alike, with
 * links to the job seeker's `applications`; without a `user` it is the loading state.
 */
export function ApplicationNotFoundPage({
  user,
  applications,
}: {
  user?: CurrentUser;
  applications: { id: string; company: string; title: string }[];
}) {
  return (
    <NotFoundLayout header={<AppHeader user={user} current="/applications" />}>
      <ApplicationNotFound applications={applications} />
    </NotFoundLayout>
  );
}

function NotFoundLayout({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <>
      {header}
      <main id="main" className="py-12">
        <Container>{children}</Container>
      </main>
      <AppFooter />
    </>
  );
}
