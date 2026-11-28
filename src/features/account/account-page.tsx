import type { ReactNode } from "react";
import { ChevronDown, Download } from "lucide-react";
import { AppFooter } from "@/features/shell/app-footer";
import { AppHeader } from "@/features/shell/app-header";
import { Avatar } from "@/features/shell/avatar";
import { AccessTokens } from "@/features/account/access-tokens";
import { deletedApplicationsText } from "@/features/account/account-text";
import { DeleteAccountForm } from "@/features/account/delete-account-form";
import { PreviewJourneyLink, ShareLinks } from "@/features/account/share-links";
import { buttonClasses } from "@/components/ui/button-classes";
import { Container } from "@/components/ui/container";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { ACCESS_TOKEN_LIFETIME, GOOGLE_PERMISSIONS_URL } from "@/lib/account";
import type { AccessToken, ShareLink } from "@/lib/api";
import type { CurrentUser } from "@/lib/current-user";
import { EXPORT_CONTENT_TYPES, type ExportFormat } from "@/lib/data-export";
import { BACKUP_DAYS, SERVER_LOG_RETENTION } from "@/lib/legal/privacy";

/**
 * The account page with skeleton shapes wherever the job seeker's data goes (BIG-73): who is
 * signed in, their Share links and Access tokens, how many Applications deleting removes, and the forms, which
 * mustn't take typing that the loaded page would throw away.
 */
export function AccountPageSkeleton() {
  return (
    <LoadingRegion label="Loading your account…">
      <AccountLayout />
    </LoadingRegion>
  );
}

/**
 * The account page (/account): who is signed in, their Share links and Access tokens, how many
 * Applications deleting removes. The route loads them, and the Pages/Account stories pass fixed
 * ones (BIG-203). `apiUrl` is the API's address, which the Access tokens card shows for scripts.
 */
export function AccountPage(props: {
  user: CurrentUser;
  count: number;
  accessTokens: AccessToken[];
  shareLinks: ShareLink[];
  apiUrl: string;
}) {
  return <AccountLayout {...props} />;
}

/** The account page, or its skeleton when there is no user yet. */
function AccountLayout({
  user,
  count,
  accessTokens,
  shareLinks,
  apiUrl,
}: {
  user?: CurrentUser;
  count?: number;
  accessTokens?: AccessToken[];
  shareLinks?: ShareLink[];
  apiUrl?: string;
}) {
  return (
    <>
      <AppHeader user={user} />
      <main id="main" className="py-12">
        <Container>
          <div className="mx-auto flex max-w-[768px] flex-col gap-8">
            <h1 className="m-0 text-[32px] font-bold leading-[1.1] text-heading md:text-[40px]">Account</h1>

            <section aria-labelledby="signed-in-title" className="card flex flex-col gap-4 p-6">
              <h2 id="signed-in-title" className="m-0 text-xl font-bold leading-[1.25] text-heading">
                Signed in with Google
              </h2>
              <div className="flex items-center gap-3">
                {user ? <Avatar user={user} /> : <Skeleton className="size-8 shrink-0 rounded-full" />}
                <div className="min-w-0 leading-tight">
                  <p className="m-0 text-sm font-medium text-heading">
                    {user ? user.name : <Skeleton className="inline-block h-3.5 w-32 align-middle" />}
                  </p>
                  <p className="m-0 break-all text-sm text-body">
                    {user ? user.email : <Skeleton className="inline-block h-3.5 w-48 align-middle" />}
                  </p>
                </div>
              </div>
              <p className="m-0 text-sm leading-[1.6] text-body">
                Your name, email, and photo come from your Google account. To change them, change them
                in Google, then sign in to Bigfoot again.
              </p>
            </section>

            <ShareSection user={user} shareLinks={shareLinks} />

            <section aria-labelledby="download-title" className="card flex flex-col gap-4 p-6">
              <h2 id="download-title" className="m-0 text-xl font-bold leading-[1.25] text-heading">
                Download my data
              </h2>
              <p className="m-0 text-base leading-[1.7] text-body">
                Download a copy of everything Bigfoot holds about you, to keep your records, move them
                somewhere else, or check what we store.
              </p>
              <ul className="m-0 flex list-none flex-col gap-4 p-0 sm:flex-row">
                {DOWNLOADS.map(({ format, label, type, description }) => (
                  <li key={format} className="flex flex-1 flex-col items-start gap-2">
                    <a
                      href={`/account/export?format=${format}`}
                      download
                      type={type}
                      aria-describedby={`download-${format}-hint`}
                      className={buttonClasses("secondary")}
                    >
                      <Download aria-hidden="true" className="size-4" />
                      Download {label}
                    </a>
                    <p id={`download-${format}-hint`} className="m-0 text-sm leading-[1.6] text-body">
                      {description}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="tokens-title" className="card flex flex-col gap-4 p-6">
              <h2 id="tokens-title" className="m-0 text-xl font-bold leading-[1.25] text-heading">
                Access tokens
              </h2>
              <p className="m-0 text-base leading-[1.7] text-body">
                An Access token lets a script, such as a cron job, read and change your Applications
                and Interviews without a browser. Anyone who has one can do the same, so treat it like
                a password. A token can’t delete your account or create other tokens. Each one stops
                working {ACCESS_TOKEN_LIFETIME} after you create it, or as soon as you revoke it.
              </p>
              {accessTokens && apiUrl ? <AccessTokens tokens={accessTokens} apiUrl={apiUrl} /> : <Skeleton className="h-40 w-full" />}
            </section>

            <section
              aria-labelledby="delete-title"
              className="card flex flex-col gap-4 border-line-danger-subtle p-6 text-base leading-[1.7] text-body"
            >
              <h2 id="delete-title" className="m-0 text-xl font-bold leading-[1.25] text-heading">
                Delete account
              </h2>
              <p className="m-0">Deleting your account removes, straight away:</p>
              <ul className={list}>
                <li>
                  {deletedApplicationsText(count)}, sample Applications included;
                </li>
                <li>your job seeker record: your Google account id and when you joined Bigfoot; and</li>
                <li>your Access tokens and Share links, which stop working.</li>
              </ul>
              <p className="m-0">
                You’ll be signed out. If you sign in again later, you start over as a new job seeker,
                with new sample Applications.
              </p>
              {/* Folded so Delete account fits a phone's screen (BIG-240); what goes stays in view above. */}
              <details className="group rounded-card border border-line bg-surface">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-card px-5 py-3 text-sm font-medium text-heading transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-brand group-open:rounded-b-none group-open:bg-card [&::-webkit-details-marker]:hidden">
                  What stays for a while, and your Google account
                  <ChevronDown className="size-4 shrink-0 text-body transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="flex flex-col gap-4 border-t border-line px-5 py-4">
                  <Subheading>What stays for a while</Subheading>
                  <ul className={list}>
                    <li>Copies in our daily database backups, for up to {BACKUP_DAYS} days.</li>
                    <li>Server logs of your visits, for up to {SERVER_LOG_RETENTION}.</li>
                    <li>
                      A record that an account was deleted, and when. It holds a one-way hash of your Google
                      account id, not the id itself, so we can show we honoured your request.
                    </li>
                  </ul>
                  <Subheading>Your Google account</Subheading>
                  <p className="m-0">
                    Deleting your Bigfoot account doesn’t change your Google account. To also remove
                    Bigfoot’s access, go to{" "}
                    <a
                      href={GOOGLE_PERMISSIONS_URL}
                      className="rounded-control text-fg-brand underline underline-offset-4 transition-colors hover:no-underline"
                    >
                      your Google account’s third-party connections
                    </a>{" "}
                    and remove Bigfoot.
                  </p>
                </div>
              </details>
              <div className="mt-2 border-t border-line pt-6">
                {user ? <DeleteAccountForm /> : <DeleteAccountFormSkeleton />}
              </div>
            </section>
          </div>
        </Container>
      </main>
      <AppFooter />
    </>
  );
}

const list = "m-0 flex list-disc flex-col gap-2 pl-6";

/** Share your progress: "Preview Alex’s Journey" at its top right (BIG-198), then the Share links. */
function ShareSection({ user, shareLinks }: { user?: CurrentUser; shareLinks?: ShareLink[] }) {
  return (
    <section aria-labelledby="share-title" className="card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 id="share-title" className="m-0 text-xl font-bold leading-[1.25] text-heading">
          Share your progress
        </h2>
        {user && <PreviewJourneyLink firstName={user.firstName} />}
      </div>
      {shareLinks && user ? (
        <ShareLinks links={shareLinks} firstName={user.firstName} />
      ) : (
        <Skeleton className="h-64 w-full" />
      )}
    </section>
  );
}

const DOWNLOADS: { format: ExportFormat; label: string; type: string; description: string }[] = [
  {
    format: "csv",
    label: "CSV",
    type: EXPORT_CONTENT_TYPES.csv,
    description: "A spreadsheet of your Applications, one per row. Opens in Excel or Google Sheets.",
  },
  {
    format: "json",
    label: "JSON",
    type: EXPORT_CONTENT_TYPES.json,
    description:
      "Everything, for moving to another tool: your profile, every field of every Application, your Share links’ labels and dates (never their passcodes), and your Access tokens’ names and dates (never their secrets).",
  },
];

function Subheading({ children }: { children: ReactNode }) {
  return <h3 className="m-0 mt-2 text-base font-medium leading-[1.25] text-heading">{children}</h3>;
}

/** DeleteAccountForm's label, input, hint and button as shapes. */
function DeleteAccountFormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Skeleton className="mb-2 h-4 w-44" />
        <Skeleton className="h-[42px] max-w-xs rounded-control" />
        <Skeleton className="mt-3 h-4 w-36" />
      </div>
      <Skeleton className="h-11 w-40" />
    </div>
  );
}
