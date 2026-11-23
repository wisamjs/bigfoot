import Link from "next/link";
import type { ReactNode } from "react";
import { formatPolicyDate } from "@/lib/legal/privacy";

// Shared pieces of the legal pages (Privacy Policy, Terms) in src/app/(legal).

export const legalH3 = "m-0 mt-6 mb-2 text-lg font-bold leading-[1.25] text-heading";
export const legalList = "my-4 flex list-disc flex-col gap-2 pl-6";

/** typography.md inline link: fg-brand, underlined, underline removed on hover. */
export function LegalLink({ href, children, alone = false }: { href: string; children: ReactNode; alone?: boolean }) {
  // `alone`: the link is the whole list item, not a link in a sentence, so it needs a 44px hit area on touch screens.
  const className = `${alone ? "touch-target justify-start " : ""}rounded-control text-fg-brand underline underline-offset-4 transition-colors hover:no-underline`;
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

/** The page title and its effective date, which links to the change log. */
export function LegalHeader({ title, effective }: { title: string; effective: string }) {
  return (
    <header className="mb-10">
      <h1 className="m-0 mb-6 text-[32px] font-bold leading-[1.1] tracking-[-0.8px] text-heading md:text-[40px] lg:text-[60px]">
        {title}
      </h1>
      <p className="m-0 text-sm leading-[1.6]">
        Effective <time dateTime={effective}>{formatPolicyDate(effective)}</time>.{" "}
        <LegalLink href="#changes">See what changed</LegalLink>.
      </p>
    </header>
  );
}

/** The table of contents: one link per section. */
export function LegalContents({ sections }: { sections: readonly { id: string; title: string }[] }) {
  return (
    <nav aria-labelledby="contents" className="mb-12">
      <h2 id="contents" className="m-0 mb-4 text-xl font-bold leading-[1.25] text-heading">
        Contents
      </h2>
      <ol className="m-0 flex list-decimal flex-col gap-2 pl-6">
        {sections.map((s) => (
          <li key={s.id}>
            <LegalLink href={`#${s.id}`} alone>
              {s.title}
            </LegalLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** A section named by its h2; its id is the table of contents' anchor. */
export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-12 scroll-mt-6 [&_p]:my-4 [&_p]:max-w-[70ch]">
      <h2 id={id} className="m-0 mb-4 text-2xl font-bold leading-[1.25] text-heading">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** The change log, newest first. */
export function ChangeLog({ changes }: { changes: readonly { date: string; summary: string }[] }) {
  return (
    <>
      <h3 className={legalH3}>Change log</h3>
      <ul className={legalList}>
        {changes.map((c) => (
          <li key={c.date}>
            <time dateTime={c.date} className="font-medium text-heading">
              {formatPolicyDate(c.date)}
            </time>
            : {c.summary}
          </li>
        ))}
      </ul>
    </>
  );
}
