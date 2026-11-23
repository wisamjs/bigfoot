import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  ChangeLog,
  LegalContents,
  LegalHeader,
  LegalLink as A,
  LegalSection,
  legalH3 as h3,
  legalList as list,
} from "@/features/legal/legal";
import {
  BACKUP_DAYS,
  ERROR_REPORT_RETENTION_DAYS,
  PRIVACY_CHANGES,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_EFFECTIVE_DATE,
  SERVER_LOG_RETENTION,
} from "@/lib/legal/privacy";
import { SUBPROCESSORS } from "@/lib/legal/subprocessors";
import { ACCESS_TOKEN_LIFETIME } from "@/lib/account";
import { SESSION_MAX_AGE_DAYS } from "@/lib/session";

export const metadata: Metadata = {
  title: "Privacy Policy · Bigfoot",
  description:
    "What Bigfoot collects about job seekers, why, who it shares it with, and how to get a copy of it or delete it.",
};

const GOOGLE_USER_DATA_POLICY = "https://developers.google.com/terms/api-services-user-data-policy";
const GOOGLE_THIRD_PARTY_ACCESS = "https://myaccount.google.com/connections";

// Section ids double as the table of contents.
const sections = [
  { id: "collect", title: "What we collect" },
  { id: "use", title: "How we use it" },
  { id: "google", title: "Information from Google" },
  { id: "providers", title: "Who we share it with" },
  { id: "cookies", title: "Cookies" },
  { id: "dnt", title: "Do Not Track and Global Privacy Control" },
  { id: "retention", title: "How long we keep it" },
  { id: "rights", title: "Your rights and choices" },
  { id: "children", title: "Children" },
  { id: "security", title: "Security and breaches" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact us" },
] as const;

type SectionId = (typeof sections)[number]["id"];

export default function PrivacyPage() {
  return (
    <article className="text-base leading-[1.7] text-body">
      <LegalHeader title="Privacy Policy" effective={PRIVACY_EFFECTIVE_DATE} />

      <section aria-labelledby="summary" className="card mb-12 p-6 md:p-8">
        <h2 id="summary" className="m-0 mb-4 text-xl font-bold leading-[1.25] text-heading">
          The short version
        </h2>
        <ul className="m-0 flex list-disc flex-col gap-2 pl-6">
          <li>
            Bigfoot is a job search tracker. We keep the Applications you enter so you can track
            them, and that is all we use them for.
          </li>
          <li>
            When you sign in with Google, we get your name, email address, profile photo and Google
            account id. We use them only to sign you in and show who is signed in.
          </li>
          <li>
            We <strong>do not sell</strong> your personal information, and we do not share it for
            advertising. Bigfoot has no ads and no analytics.
          </li>
          <li>
            A few service providers help us run Bigfoot. Your data is stored in the United States.
          </li>
          <li>
            You can edit or delete any Application in your dashboard. On your{" "}
            <A href="/account">Account page</A>, you can download a copy of your data and delete
            your account yourself.
          </li>
        </ul>
      </section>

      <LegalContents sections={sections} />

      <p>
        This policy explains how Bigfoot handles personal information about job seekers in the
        United States and Canada. “We” and “us” mean the people who run Bigfoot. “You” means you, the
        job seeker using it.
      </p>

      <Section id="collect">
        <h3 className={h3}>From Google, when you sign in</h3>
        <p>
          Your name, email address, profile photo and Google account id. We never see your Google
          password. We keep your name, email and photo only in your browser’s sign-in cookie, not in
          our database. We store your Google account id in our database to know which Applications
          are yours.
        </p>
        <h3 className={h3}>What you enter</h3>
        <p>
          Your Applications: the company, job title, posting link, location, salary, the date you
          applied, its Status and Outcome, and each Interview: its kind and, if you give them, its
          date, your Interview notes (what they asked, how it went and a takeaway for next
          time) and your Prep notes, which hold whatever you write there.
        </p>
        <h3 className={h3}>Access tokens, if you create any</h3>
        <p>
          An Access token lets a script of yours use Bigfoot as you. For each one, we store the name
          you give it, when you created it, when it was last used and when it expires. We store a
          one-way hash of the token’s secret, not the secret itself, so we cannot show it to you
          again or use it ourselves.
        </p>
        <h3 className={h3}>Technical information</h3>
        <p>
          Like most websites, our servers keep short-lived logs of requests, such as your IP
          address, browser type, the pages you open and the time.
        </p>
        <p>
          When something breaks, the website or the API sends an error report to Sentry: what failed
          and where in our code, the page or API address, your browser type, and a one-way hash of
          your Google account id. Reports leave out your Applications, your email address, your IP
          address and your cookies.
        </p>
        <p>
          We do not use analytics or advertising tools. If we ever add analytics, we will update this
          policy first.
        </p>
      </Section>

      <Section id="use">
        <p>We use your personal information only to:</p>
        <ul className={list}>
          <li>sign you in and keep you signed in;</li>
          <li>store and show your Applications and their Interviews;</li>
          <li>keep Bigfoot secure, prevent abuse, and fix errors;</li>
          <li>answer you when you contact us; and</li>
          <li>meet our legal obligations.</li>
        </ul>
        <p>
          We <strong>do not sell</strong> your personal information, and we{" "}
          {/* cspell:disable-next-line -- the CCPA's own term, quoted in its US spelling */}
          <strong>do not share</strong> it for “cross-context behavioral advertising”, as those
          terms are defined in California law. We do not use your Applications to train AI models,
          and we do not make automated decisions about you.
        </p>
      </Section>

      <Section id="google">
        <p>
          Bigfoot’s use and transfer of information received from Google APIs adheres to the{" "}
          <A href={GOOGLE_USER_DATA_POLICY}>Google API Services User Data Policy</A>, including the
          Limited Use requirements.
        </p>
        <p>
          We ask Google only for your basic profile: your name, email address, profile photo and
          account id. We use it only to sign you in. We do not read your Gmail, Calendar, Drive or
          contacts. We share your Google information only with the service providers below, and
          only to run Bigfoot.
        </p>
      </Section>

      <Section id="providers">
        <p>
          We use these service providers to run Bigfoot. They may use your information only to
          provide their service to us.
        </p>
        <div className="my-6 overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm leading-[1.6]">
            <caption className="sr-only">Service providers and what each receives</caption>
            <thead className="bg-surface">
              <tr>
                <th scope="col" className={th}>
                  Provider
                </th>
                <th scope="col" className={th}>
                  What it receives
                </th>
                <th scope="col" className={th}>
                  Where
                </th>
              </tr>
            </thead>
            <tbody>
              {SUBPROCESSORS.map((p) => (
                <tr key={p.name} className="border-t border-line align-top">
                  <th scope="row" className={`${td} font-medium text-heading`}>
                    <A href={p.privacyUrl}>{p.name}</A>
                    <span className="block font-normal text-body">{p.purpose}</span>
                  </th>
                  <td className={td}>{p.receives}</td>
                  <td className={td}>{p.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          <strong>Where your data is stored.</strong> Your Applications are stored in the United
          States. If you live in Canada, your information is stored and processed outside Canada
          and outside your province, where the courts, police and government may be able to access
          it under local law.
        </p>
        <p>
          We may also disclose information if the law requires it, to protect someone’s safety, or
          if Bigfoot is sold or merged. In a sale or merger, this policy would continue to apply to
          your information unless you agree otherwise.
        </p>
      </Section>

      <Section id="cookies">
        <p>
          Bigfoot uses only <strong>strictly necessary</strong> cookies. They are set by our sign-in
          system (Auth.js):
        </p>
        <ul className={list}>
          <li>
            a session cookie that keeps you signed in. It is encrypted, holds your name, email,
            profile photo and Google account id, and expires after {SESSION_MAX_AGE_DAYS} days or
            when you sign out;
            and
          </li>
          <li>short-lived cookies that protect the sign-in process from forgery.</li>
        </ul>
        <p>We do not set analytics, advertising or tracking cookies.</p>
      </Section>

      <Section id="dnt">
        <p>
          Bigfoot does not track you on other websites. We do not sell or share your personal
          information. So for everyone, it is as if Do Not Track and Global Privacy Control were
          already on. If that ever changes, we will treat Global Privacy Control as a request to opt
          out of sale and sharing.
        </p>
      </Section>

      <Section id="retention">
        <ul className={list}>
          <li>
            <strong>Applications:</strong> until you delete them, or until you delete your account.
          </li>
          <li>
            <strong>Access tokens:</strong> until you revoke them, or until you delete your account.
            A token stops working {ACCESS_TOKEN_LIFETIME} after you create it, but stays on your
            Account page until you revoke it.
          </li>
          <li>
            <strong>Backups:</strong> our database is backed up daily, and each backup is kept for{" "}
            {BACKUP_DAYS} days. Deleted data leaves the backups within {BACKUP_DAYS} days.
          </li>
          <li>
            <strong>Server logs:</strong> up to {SERVER_LOG_RETENTION}.
          </li>
          <li>
            <strong>Error reports:</strong> up to {ERROR_REPORT_RETENTION_DAYS} days, at Sentry.
          </li>
          <li>
            <strong>Account deletions:</strong> when you delete your account, we record that an
            account was deleted and when. The record holds a one-way hash of your Google account id,
            not the id itself, and nothing else about you. We keep it while Bigfoot runs, so we can
            show we honoured your request.
          </li>
          <li>
            <strong>Emails you send us:</strong> as long as we need them to answer you, and up to 2
            years for privacy requests and complaints, so we can show how we handled them.
          </li>
        </ul>
        <p>
          <strong>Inactive accounts.</strong> We do not delete inactive accounts today. If we start
          to, we will update this policy before we delete anything.
        </p>
      </Section>

      <Section id="rights">
        <p>
          Wherever you live, you can do the following. Laws in California, other US states,
          Canada and Quebec give you these rights, and we offer them to everyone.
        </p>
        <ul className={list}>
          <li>
            <strong>See your data, and take it with you.</strong> Your Applications are all on your
            dashboard. Download a copy of everything we hold about you on your{" "}
            <A href="/account">Account page</A>: a CSV spreadsheet of your Applications, or a JSON
            file with your profile, every Application, and the names and dates of your Access
            tokens.
          </li>
          <li>
            <strong>Correct it.</strong> Edit any Application in your dashboard. Your name, email
            and photo come from Google: change them in your Google account, then sign in to Bigfoot
            again.
          </li>
          <li>
            <strong>Delete it.</strong> Delete any Application in your dashboard. Delete your
            account on your <A href="/account">Account page</A>: it removes you, all of your
            Applications and all of your Access tokens straight away, and signs you out.
          </li>
          <li>
            <strong>Withdraw consent.</strong> Delete your account on your{" "}
            <A href="/account">Account page</A>. You can also remove Bigfoot’s access in your{" "}
            <A href={GOOGLE_THIRD_PARTY_ACCESS}>Google account’s third-party connections</A>.
          </li>
        </ul>
        <p>
          You can also email us at <Email /> to use any of these rights. We answer within 30 days. We
          may ask you to confirm the request from the email address on your Google account, so we
          know it is you. We will never treat you differently for using your rights.
        </p>
        <p>
          If you are not happy with our answer, you can complain to your privacy regulator: in
          Canada, the{" "}
          <A href="https://www.priv.gc.ca/">Office of the Privacy Commissioner of Canada</A>; in
          Quebec, the{" "}
          <A href="https://www.cai.gouv.qc.ca/">Commission d’accès à l’information</A>; in
          California, the <A href="https://cppa.ca.gov/">California Privacy Protection Agency</A>.
        </p>
      </Section>

      <Section id="children">
        <p>
          Bigfoot is not for children under 13, and they may not use it. If you are under 18, you
          may need a parent’s or guardian’s consent to use Bigfoot, depending on where you live. In
          Quebec, a parent must consent for anyone under 14. If we learn that we have information
          about a child under 13, we will delete it.
        </p>
      </Section>

      <Section id="security">
        <p>
          We protect your information in three ways. Everything sent between your browser and
          Bigfoot is encrypted (HTTPS). Your sign-in cookie is encrypted. And each job seeker can
          reach only their own Applications. An Access token reaches only the Applications of the
          job seeker who created it, so anyone you give one to can read and change yours until you
          revoke it or it expires. Only the people who run Bigfoot can open the database,
          and only to run and fix Bigfoot. No system is perfectly secure, so we cannot promise your
          information will never be exposed.
        </p>
        <p>
          A breach is when someone gets your information who should not have it. If a breach
          creates a real risk of significant harm to you, we will report it to the Privacy
          Commissioner of Canada as soon as we can. In Quebec, we will also report it to the
          Commission d’accès à l’information. We will tell you by posting a notice on Bigfoot. We
          keep a record of every breach, big or small.
        </p>
      </Section>

      <Section id="changes">
        <p>
          When we change this policy, we update the effective date at the top of this page and list
          the change below. We do not store your email address, so this page is where changes
          appear.
        </p>
        <ChangeLog changes={PRIVACY_CHANGES} />
      </Section>

      <Section id="contact">
        <p>
          Questions, requests or complaints about privacy? Email us at <Email />. Your email goes to
          the person in charge of protecting personal information at Bigfoot.
        </p>
        <p>
          Ready to get started? <A href="/">Go back to Bigfoot</A>.
        </p>
      </Section>
    </article>
  );
}

const th = "px-4 py-3 text-xs font-medium uppercase tracking-[0.4px] text-heading";
const td = "px-4 py-3";

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  return (
    <LegalSection id={id} title={sections.find((s) => s.id === id)!.title}>
      {children}
    </LegalSection>
  );
}

function Email() {
  return <A href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</A>;
}
