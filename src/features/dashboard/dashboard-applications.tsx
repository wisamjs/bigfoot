"use client";

import { useState } from "react";
import { ApplicationList } from "@/features/applications/application-list";
import { ApplicationPanel } from "@/features/applications/application-panel";
import { doneWithoutOffer, type Application } from "@/lib/applications";

/**
 * The dashboard's Applications: each card opens its Application in the side panel, and Show done
 * adds the Done group.
 */
export function DashboardApplications({ applications }: { applications: Application[] }) {
  const [showDone, setShowDone] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const doneCount = doneWithoutOffer(applications).length;

  return (
    <>
      {doneCount > 0 && (
        <label className="mb-4 flex w-fit cursor-pointer items-center gap-2 text-sm font-medium text-heading">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
            className="size-4 cursor-pointer rounded-control accent-brand"
          />
          Show done ({doneCount})
        </label>
      )}
      <ApplicationList applications={applications} showDone={showDone} onOpen={(app) => setOpenId(app.id)} />

      <ApplicationPanel
        view={openId ? { kind: "application", id: openId } : null}
        applications={applications}
        onClose={() => setOpenId(null)}
      />
    </>
  );
}
