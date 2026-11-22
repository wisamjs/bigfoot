"use client";

import { useState } from "react";
import { ApplicationList } from "@/features/applications/applicationList";
import { doneWithoutOffer, type Application } from "@/lib/applications";

/**
 * The dashboard's Applications: each card links to its Application's page, and Show done adds the
 * Done group.
 */
export function DashboardApplications({ applications }: { applications: Application[] }) {
  const [showDone, setShowDone] = useState(false);

  const doneCount = doneWithoutOffer(applications).length;

  return (
    <>
      {doneCount > 0 && (
        <label className="mb-4 flex w-fit cursor-pointer items-center gap-2 text-sm pointer-coarse:min-h-11 font-medium text-heading">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
            className="size-4 cursor-pointer rounded-control accent-brand"
          />
          Show done ({doneCount})
        </label>
      )}
      <ApplicationList applications={applications} showDone={showDone} linked />
    </>
  );
}
