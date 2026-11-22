"use client";

import { useState } from "react";
import { PipelineBoard } from "@/features/applications/pipeline-board";
import { doneWithoutOffer, type Application } from "@/lib/applications";

/**
 * The dashboard's Pipeline board: each card links to its Application's page, and Show done adds
 * the Done column.
 */
export function DashboardPipeline({ applications, subtitle }: { applications: Application[]; subtitle: string }) {
  const [showDone, setShowDone] = useState(false);

  const doneCount = doneWithoutOffer(applications).length;

  return (
    <PipelineBoard
      title="Pipeline"
      subtitle={subtitle}
      applications={applications}
      showDone={showDone}
      linked
      actions={
        doneCount > 0 && (
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-heading">
            <input
              type="checkbox"
              checked={showDone}
              onChange={(e) => setShowDone(e.target.checked)}
              className="size-4 cursor-pointer rounded-control accent-brand"
            />
            Show done ({doneCount})
          </label>
        )
      }
    />
  );
}
