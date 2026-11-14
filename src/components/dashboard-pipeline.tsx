"use client";

import { useState } from "react";
import { DeleteConfirmation } from "@/components/application-dialogs";
import { EditApplicationForm } from "@/components/edit-application-modal";
import { Modal } from "@/components/modal";
import { PipelineBoard } from "@/components/pipeline-board";
import { doneWithoutOffer, type Application } from "@/lib/applications";

/**
 * The dashboard's Pipeline board: each card opens its Application for editing, and Show done
 * adds the Done column.
 */
export function DashboardPipeline({ applications, subtitle }: { applications: Application[]; subtitle: string }) {
  const [showDone, setShowDone] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const doneCount = doneWithoutOffer(applications).length;
  // Looked up by id, so the dialog shows the Application as saved after each change.
  const editing = applications.find((a) => a.id === editingId) ?? null;
  const deleting = applications.find((a) => a.id === deletingId) ?? null;

  return (
    <>
      <PipelineBoard
        title="Pipeline"
        subtitle={subtitle}
        applications={applications}
        showDone={showDone}
        onOpen={(app) => setEditingId(app.id)}
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

      <Modal open={editing !== null} onClose={() => setEditingId(null)} title="Edit application" wide>
        {editing && (
          <EditApplicationForm
            app={editing}
            onDone={() => setEditingId(null)}
            onDelete={() => {
              setEditingId(null);
              setDeletingId(editing.id);
            }}
          />
        )}
      </Modal>

      <Modal open={deleting !== null} onClose={() => setDeletingId(null)} title="Delete application?">
        {deleting && <DeleteConfirmation app={deleting} onDone={() => setDeletingId(null)} />}
      </Modal>
    </>
  );
}
