import { Fragment } from "react";
import type { SummaryCount } from "@/lib/applications";

/**
 * The line under a page's heading, the counts that aren’t zero, Offers in the success colour: the
 * dashboard's (BIG-183, dashboardSummary), "1 Offer to decide · 4 Interviews in the next 2 weeks · 2
 * awaiting a date · 2 waiting to hear back", and the Applications page's (BIG-252,
 * applicationsSummary), "12 In Progress · 1 Offer · 4 Done". Nothing when every count is zero.
 */
export function SummaryLine({ counts }: { counts: SummaryCount[] }) {
  if (counts.length === 0) return null;
  return (
    <p className="m-0 text-body">
      {counts.map(({ id, text }, index) => (
        <Fragment key={id}>
          {index > 0 && <span aria-hidden> · </span>}
          <span className={id === "offers" ? "font-medium text-fg-success-strong" : undefined}>{text}</span>
        </Fragment>
      ))}
    </p>
  );
}
