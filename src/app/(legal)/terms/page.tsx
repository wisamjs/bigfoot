import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  ChangeLog,
  LegalContents,
  LegalHeader,
  LegalLink as A,
  LegalSection,
  legalList as list,
} from "@/features/legal/legal";
import { PRIVACY_CONTACT_EMAIL } from "@/lib/legal/privacy";
import { GOVERNING_LAW, TERMS_CHANGES, TERMS_EFFECTIVE_DATE } from "@/lib/legal/terms";

export const metadata: Metadata = {
  title: "Terms of Service · Bigfoot",
  description:
    "The rules for using Bigfoot: who can use it, what you may not do with it, who owns your Applications, and what we promise.",
};

// Section ids double as the table of contents.
const sections = [
  { id: "agreement", title: "Agreeing to these Terms" },
  { id: "eligibility", title: "Who can use Bigfoot" },
  { id: "content", title: "Your content" },
  { id: "acceptable-use", title: "Acceptable use" },
  { id: "suspension", title: "Suspending accounts" },
  { id: "closing", title: "Closing your account" },
  { id: "as-is", title: "Bigfoot is provided “as is”" },
  { id: "liability", title: "Limitation of liability" },
  { id: "changes", title: "Changes to these Terms" },
  { id: "law", title: "Governing law" },
  { id: "contact", title: "Contact us" },
] as const;

type SectionId = (typeof sections)[number]["id"];

export default function TermsPage() {
  return (
    <article className="text-base leading-[1.7] text-body">
      <LegalHeader title="Terms of Service" effective={TERMS_EFFECTIVE_DATE} />

      <section aria-labelledby="summary" className="card mb-12 p-6 md:p-8">
        <h2 id="summary" className="m-0 mb-4 text-xl font-bold leading-[1.25] text-heading">
          The short version
        </h2>
        <ul className="m-0 flex list-disc flex-col gap-2 pl-6">
          <li>You must be 13 or older to use Bigfoot.</li>
          <li>Your Applications are yours. We store them only so Bigfoot can show them to you.</li>
          <li>Don’t break the law with Bigfoot, abuse it, or scrape it.</li>
          <li>
            Bigfoot is a free side project. It comes with no guarantees, and it may be down or
            change.
          </li>
          <li>
            You can close your account at any time on your <A href="/account">Account page</A>.
          </li>
        </ul>
      </section>

      <LegalContents sections={sections} />

      <Section id="agreement">
        <p>
          These Terms are an agreement between you and the people who run Bigfoot (“we” and “us”).
          By signing in to Bigfoot, you agree to them. If you don’t agree, please don’t use Bigfoot.
        </p>
        <p>
          Our <A href="/privacy">Privacy Policy</A> explains what we do with your personal
          information. It is not part of these Terms, but please read it too.
        </p>
      </Section>

      <Section id="eligibility">
        <p>
          You must be 13 or older to use Bigfoot. If you are under 18, you may need a parent’s or
          guardian’s consent, depending on where you live. In Quebec, a parent must consent for
          anyone under 14.
        </p>
        <p>
          You sign in with your Google account, so you also need to follow Google’s rules for it.
          Keep your Google account secure: anyone who can sign in to it can see your Applications.
        </p>
        <p>
          On your <A href="/account">Account page</A> you can create Access tokens, which let your
          own scripts read and change your Applications. Keep them secret: anyone who has one can
          do the same, and what is done with your Access tokens counts as done by you. Revoke a
          token on your Account page if someone else may have it.
        </p>
      </Section>

      <Section id="content">
        <p>
          Your content is everything you enter in Bigfoot: your Applications, their Interviews,
          and the details you add. Your content stays yours.
        </p>
        <p>
          You give us permission (a licence) to store, copy and show your content only so we can
          provide Bigfoot to you. This permission ends when you delete your content or your
          account, except for copies that remain in backups for a short time, as the Privacy Policy
          explains.
        </p>
        <p>
          You are responsible for your content. Only enter information you have the right to use.
        </p>
      </Section>

      <Section id="acceptable-use">
        <p>When you use Bigfoot, you must not:</p>
        <ul className={list}>
          <li>break the law, or enter content that is illegal;</li>
          <li>harass or harm anyone, or enter content that does;</li>
          <li>
            scrape Bigfoot, or use bots or scripts to access it, other than downloading your own
            data on your Account page, or reaching your own Applications with an Access token you
            created there;
          </li>
          <li>
            try to reach other job seekers’ data, or get around Bigfoot’s security or limits;
          </li>
          <li>overload Bigfoot or disrupt it for others; or</li>
          <li>copy, resell or pretend to be Bigfoot.</li>
        </ul>
      </Section>

      <Section id="suspension">
        <p>
          If you break these Terms, or use Bigfoot in a way that could harm it, us or other people,
          we may suspend or close your account, with or without notice.
        </p>
      </Section>

      <Section id="closing">
        <p>
          You can close your account at any time. Delete it on your{" "}
          <A href="/account">Account page</A>: it removes you and all of your Applications straight
          away, and signs you out. Before you do, you can download a copy of your data there.
        </p>
      </Section>

      <Section id="as-is">
        <p>
          Bigfoot is a free side project. We provide it “as is” and “as available”, without
          warranties of any kind, whether express or implied, including that it is fit for a
          particular purpose.
        </p>
        <p>
          We don’t promise that Bigfoot will be available at any given time, free of errors, or that
          it will keep your content safe from loss. We may change Bigfoot, or stop running it, at
          any time. Keep your own copy of anything important: download it on your{" "}
          <A href="/account">Account page</A>.
        </p>
      </Section>

      <Section id="liability">
        <p>
          To the fullest extent the law allows, we are not liable for any indirect, incidental,
          special, consequential or punitive damages, or for lost profits, data, opportunities or
          goodwill, that come from your use of Bigfoot. This includes a job you didn’t get, or an
          Interview you missed.
        </p>
        <p>
          To the fullest extent the law allows, our total liability for any claim about Bigfoot is
          limited to CA$100.
        </p>
        <p>
          Some places don’t allow these limits. Nothing in these Terms takes away rights you have
          under consumer protection laws that can’t be waived.
        </p>
      </Section>

      <Section id="changes">
        <p>
          When we change these Terms, we update the effective date at the top of this page and list
          the change below. We do not store your email address, so this page is where changes
          appear. If you keep using Bigfoot after a change, you agree to the new Terms.
        </p>
        <ChangeLog changes={TERMS_CHANGES} />
      </Section>

      <Section id="law">
        <p>
          These Terms are governed by the laws of {GOVERNING_LAW}. Any dispute about them will be
          decided by the courts of Ontario, unless the law where you live gives you the right to go
          to court there.
        </p>
      </Section>

      <Section id="contact">
        <p>
          Questions about these Terms? Email us at{" "}
          <A href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</A>.
        </p>
        <p>
          Ready to get started? <A href="/">Go back to Bigfoot</A>.
        </p>
      </Section>
    </article>
  );
}

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  return (
    <LegalSection id={id} title={sections.find((s) => s.id === id)!.title}>
      {children}
    </LegalSection>
  );
}
