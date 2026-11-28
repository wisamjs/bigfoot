import { Fragment } from "react";
import type { SummaryCount } from "@/lib/applications";

/**
 * The line under the dashboard's heading (BIG-183): "1 Offer to decide · 4 Interviews in the next 2
 * weeks · 2 awaiting a date · 2 waiting to hear back", the counts that aren’t zero (dashboardSummary), Offers in the
 * success colour. Nothing when every count is zero.
 */
export function DashboardSummary({ counts }: { counts: SummaryCount[] }) {
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
