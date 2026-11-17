import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { AppFooter } from "@/components/app-footer";
import { AccessTokens } from "@/components/access-tokens";
import { AppHeader, Avatar } from "@/components/app-header";
import { DeleteAccountForm } from "@/components/delete-account-form";
import { Download } from "lucide-react";
import { buttonClasses, Container, Wordmark } from "@/components/ui";
import { ACCESS_TOKEN_LIFETIME, GOOGLE_PERMISSIONS_URL } from "@/lib/account";
import { API_URL, listAccessTokens, listApplications } from "@/lib/api";
import { getCurrentUser } from "@/lib/dal";
import { EXPORT_CONTENT_TYPES, type ExportFormat } from "@/lib/data-export";
import { BACKUP_DAYS, SERVER_LOG_RETENTION } from "@/lib/legal/privacy";

export const metadata: Metadata = {
  title: "Account · Bigfoot",
};

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <Account />
    </Suspense>
  );
}

async function Account() {
  const user = await getCurrentUser();
  const [applications, accessTokens] = await Promise.all([listApplications(user.id), listAccessTokens(user.id)]);
  const count = applications.length;

  return (
    <>
      <AppHeader user={user} current="/account" />
      <main className="py-12">
        <Container>
          <div className="mx-auto flex max-w-[768px] flex-col gap-8">
          <h1 className="m-0 text-[32px] font-bold leading-[1.1] text-heading md:text-[40px]">Account</h1>

          <section aria-labelledby="signed-in-title" className="card flex flex-col gap-4 p-6">
            <h2 id="signed-in-title" className="m-0 text-xl font-bold leading-[1.25] text-heading">
              Signed in with Google
            </h2>
            <div className="flex items-center gap-3">
              <Avatar user={user} />
              <div className="min-w-0 leading-tight">
                <p className="m-0 text-sm font-medium text-heading">{user.name}</p>
                <p className="m-0 break-all text-sm text-body">{user.email}</p>
              </div>
            </div>
            <p className="m-0 text-sm leading-[1.6] text-body">
              Your name, email and photo come from your Google account. To change them, change them
              in Google, then sign in to Bigfoot again.
            </p>
          </section>

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
            <AccessTokens tokens={accessTokens} apiUrl={API_URL} />
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
                {count === 1 ? "your 1 Application" : `all ${count} of your Applications`}, sample
                Applications included;
              </li>
              <li>your job seeker record: your Google account id and when you joined Bigfoot; and</li>
              <li>your Access tokens, which stop working.</li>
            </ul>
            <p className="m-0">
              You’ll be signed out. If you sign in again later, you start over as a new job seeker,
              with new sample Applications.
            </p>
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
            <div className="mt-2 border-t border-line pt-6">
              <DeleteAccountForm />
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
      "Everything, for moving to another tool: your profile, every field of every Application, and your Access tokens’ names and dates (never their secrets).",
  },
];

function Subheading({ children }: { children: ReactNode }) {
  return <h3 className="m-0 mt-2 text-base font-medium leading-[1.25] text-heading">{children}</h3>;
}

function AccountSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <header className="border-b border-line">
        <Container className="flex h-[72px] items-center">
          <Wordmark />
        </Container>
      </header>
      <Container className="py-12">
        <div className="mx-auto flex max-w-[768px] flex-col gap-8">
        <span className="sr-only">Loading your account…</span>
        <div className="h-10 w-48 animate-pulse rounded-control bg-card" />
        <div className="h-40 animate-pulse rounded-card bg-card" />
        <div className="h-96 animate-pulse rounded-card bg-card" />
        </div>
      </Container>
    </div>
  );
}
