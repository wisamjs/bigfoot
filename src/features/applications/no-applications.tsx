import type { ReactNode } from "react";
import { AddApplicationLink } from "@/features/applications/add-links";
import { ClipboardBigfoot, MagnifierBigfoot } from "@/features/shell/illustrations";

/**
 * No Applications yet, in the Applications page's card and the dashboard's: what the list is for,
 * and a way to add the first one. `className` draws a rule above it, under a card's heading, and
 * `level` follows the headings above it: 2 on the Applications page, 3 under the dashboard card's h2.
 */
export function NoApplications({ className, level = 2 }: { className?: string; level?: HeadingLevel }) {
  return (
    <EmptyApplications
      className={className}
      level={level}
      bigfoot={<ClipboardBigfoot className="h-auto w-[300px] max-w-full" />}
      heading="Your search starts here"
      action={<AddApplicationLink>Add your first Application</AddApplicationLink>}
    >
      Add each role as you apply. Bigfoot keeps every Application and what’s next for it in one place, until you find
      yours.
    </EmptyApplications>
  );
}

/**
 * A Progress filter that matches nothing (BIG-252), which only a stale URL can pick, as the filter
 * leaves out values with no Applications: "No Waiting Applications right now", and `action`, Clear
 * filter.
 */
export function NoMatchingApplications({ label, action, className }: { label: string; action: ReactNode; className?: string }) {
  return (
    <EmptyApplications
      className={className}
      bigfoot={<MagnifierBigfoot className="h-auto w-[260px] max-w-full" />}
      heading={`No ${label} Applications right now`}
      action={action}
    >
      Nothing you’re tracking matches this filter. Clear it to see your Applications.
    </EmptyApplications>
  );
}

type HeadingLevel = 2 | 3;

/**
 * An empty list in its card: Bigfoot, a heading, a line, and one call to action, centred where the
 * table would be; also the dashboard's Applications card with every Application Done (BIG-253).
 */
export function EmptyApplications({
  bigfoot,
  heading,
  action,
  className = "",
  level = 2,
  children,
}: {
  className?: string;
  level?: HeadingLevel;
  bigfoot: ReactNode;
  heading: string;
  action: ReactNode;
  children: ReactNode;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className={`flex flex-col items-center gap-4 px-6 pb-14 pt-10 text-center ${className}`}>
      {bigfoot}
      <div className="flex max-w-[460px] flex-col gap-2">
        <Heading className="m-0 text-2xl font-bold leading-[1.25] text-heading">{heading}</Heading>
        <p className="m-0 text-base leading-[1.7] text-body">{children}</p>
      </div>
      {action}
    </div>
  );
}
