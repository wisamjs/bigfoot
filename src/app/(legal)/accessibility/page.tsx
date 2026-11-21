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
import {
  ACCESSIBILITY_CHANGES,
  ACCESSIBILITY_EFFECTIVE_DATE,
  CONFORMANCE_TARGET,
} from "@/lib/legal/accessibility";
import { PRIVACY_CONTACT_EMAIL } from "@/lib/legal/privacy";

export const metadata: Metadata = {
  title: "Accessibility · Bigfoot",
  description:
    "The accessibility standard Bigfoot aims to meet, how we check it, what we know falls short, and how to report a barrier.",
};

// Section ids double as the table of contents.
const sections = [
  { id: "target", title: "Our target" },
  { id: "checks", title: "How we check" },
  { id: "limitations", title: "Known limitations" },
  { id: "report", title: "Report a barrier" },
  { id: "changes", title: "Changes to this statement" },
] as const;

type SectionId = (typeof sections)[number]["id"];

export default function AccessibilityPage() {
  return (
    <article className="text-base leading-[1.7] text-body">
      <LegalHeader title="Accessibility" effective={ACCESSIBILITY_EFFECTIVE_DATE} />

      <p className="m-0 mb-12 max-w-[70ch]">
        Everyone looking for work should be able to track their search in Bigfoot, whether they
        use a keyboard, a screen reader, zoom, or a phone.
      </p>

      <LegalContents sections={sections} />

      <Section id="target">
        <p>
          Bigfoot aims to conform to the Web Content Accessibility Guidelines (WCAG) 2.2 at Level
          AA. That covers WCAG 2.1 Level AA, the standard Ontario’s AODA and US guidance under the
          ADA point to.
        </p>
      </Section>

      <Section id="checks">
        <p>Before any change ships, automated checks run on every page, signed in and signed out:</p>
        <ul className={list}>
          <li>
            axe-core tests each page, and each dialog it opens, against {CONFORMANCE_TARGET} in
            light and dark mode.
          </li>
          <li>Every dialog is used with the keyboard alone: focus stays inside, and Escape closes it.</li>
          <li>Every page is checked at 320 pixels wide, so it reflows without scrolling sideways.</li>
          <li>Every component test checks what it renders with axe-core too.</li>
        </ul>
        <p>
          Automated checks don’t catch everything, so we also test pages with a keyboard and with
          VoiceOver on macOS. Bigfoot follows your system’s dark mode and reduced-motion settings.
        </p>
      </Section>

      <Section id="limitations">
        <p>
          Signing in happens on Google’s own pages, which we don’t control. We don’t know of other
          barriers. If you find one, please tell us.
        </p>
      </Section>

      <Section id="report">
        <p>
          If something in Bigfoot is hard or impossible for you to use, email us at{" "}
          <A href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</A>. Tell us the page,
          what you were trying to do, and the browser and assistive technology you use, if any.
          We’ll reply, and fix the barrier or help you another way.
        </p>
      </Section>

      <Section id="changes">
        <p>
          When we change this statement, we update the effective date at the top of this page and
          list the change below.
        </p>
        <ChangeLog changes={ACCESSIBILITY_CHANGES} />
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
