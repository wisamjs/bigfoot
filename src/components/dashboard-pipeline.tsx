"use client";

import { useState } from "react";
import { ApplicationPanel } from "@/components/application-panel";
import { PipelineBoard } from "@/components/pipeline-board";
import { doneWithoutOffer, type Application } from "@/lib/applications";

/**
 * The dashboard's Pipeline board: each card opens its Application in the side panel, and Show
 * done adds the Done column.
 */
export function DashboardPipeline({ applications, subtitle }: { applications: Application[]; subtitle: string }) {
  const [showDone, setShowDone] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const doneCount = doneWithoutOffer(applications).length;

  return (
    <>
      <PipelineBoard
        title="Pipeline"
        subtitle={subtitle}
        applications={applications}
        showDone={showDone}
        onOpen={(app) => setOpenId(app.id)}
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

      <ApplicationPanel
        view={openId ? { kind: "application", id: openId } : null}
        applications={applications}
        onClose={() => setOpenId(null)}
      />
    </>
  );
}
