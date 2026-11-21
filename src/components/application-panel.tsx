"use client";

import { ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { DeleteConfirmation } from "@/components/application-dialogs";
import { ApplicationEditor, NewApplicationForm } from "@/components/application-forms";
import { Modal, SidePanel } from "@/components/modal";
import { Badge, SampleBadge } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { OUTCOME_OPTIONS, STATUS_OPTIONS, type Application } from "@/lib/applications";

/** What the panel shows: an empty Application to add, one Application, or a list to pick from. */
export type PanelView =
  | { kind: "add" }
  | { kind: "application"; id: string }
  | { kind: "list"; title: string; ids: string[] };

/**
 * The side panel beside the Pipeline. It shows one whole Application to read and edit, an empty
 * one to add, or a list of Applications that each open in the panel with a Back link. Closed
 * while `view` is null. Applications are looked up by id in `applications`, so the panel shows
 * each one as saved after every change.
 */
export function ApplicationPanel({
  view,
  applications,
  onClose,
}: {
  view: PanelView | null;
  applications: Application[];
  onClose: () => void;
}) {
  // The Application opened from a list, and the one to put focus back on after Back.
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [returnToId, setReturnToId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const find = (id: string | null) => applications.find((a) => a.id === id) ?? null;
  const fromList = view?.kind === "list";
  const shown = find(view?.kind === "application" ? view.id : fromList ? openedId : null);
  const deleting = find(deletingId);
  // An Application deleted while open closes the panel; opened from a list, it shows the list.
  const open = view !== null && (view.kind !== "application" || shown !== null);

  function close() {
    setOpenedId(null);
    setReturnToId(null);
    onClose();
  }

  const title = shown ? shown.company : view?.kind === "list" ? view.title : "Add application";

  return (
    <>
      <SidePanel
        open={open}
        onClose={close}
        title={title}
        subtitle={shown?.title}
        onBack={
          shown && fromList
            ? () => {
                setReturnToId(shown.id);
                setOpenedId(null);
              }
            : undefined
        }
      >
        {shown ? (
          // Keyed, so each Application opened from a list starts with its salary hidden.
          <ApplicationEditor
            key={shown.id}
            app={shown}
            onDelete={() => {
              // One dialog at a time: the confirmation replaces the panel.
              setDeletingId(shown.id);
              close();
            }}
          />
        ) : view?.kind === "list" ? (
          <ApplicationList
            applications={view.ids.flatMap((id) => find(id) ?? [])}
            focusId={returnToId}
            onOpen={setOpenedId}
          />
        ) : (
          <NewApplicationForm onDone={close} />
        )}
      </SidePanel>

      <Modal open={deleting !== null} onClose={() => setDeletingId(null)} title="Delete application?">
        {deleting && <DeleteConfirmation app={deleting} onDone={() => setDeletingId(null)} />}
      </Modal>
    </>
  );
}

function ApplicationList({
  applications,
  focusId,
  onOpen,
}: {
  applications: Application[];
  /** The Application the job seeker came Back from. */
  focusId: string | null;
  onOpen: (id: string) => void;
}) {
  if (applications.length === 0) {
    return <p className="m-0 text-sm text-body">These Applications have been deleted.</p>;
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {applications.map((app) => {
        const state = app.outcome ? OUTCOME_OPTIONS[app.outcome] : STATUS_OPTIONS[app.status];
        return (
          <li key={app.id} className="relative flex items-center gap-3 rounded-control border border-line bg-surface p-3 transition-colors hover:border-line-medium hover:bg-card">
            <div className="min-w-0 flex-1">
              <p className="m-0 text-sm font-medium leading-5 text-heading">
                {/* Stretched button, as on the Pipeline's cards: the whole row opens the Application. */}
                <button
                  type="button"
                  // eslint-disable-next-line jsx-a11y/no-autofocus -- on Back to list, focus returns to the row that was opened.
                  autoFocus={app.id === focusId}
                  onClick={() => onOpen(app.id)}
                  className="cursor-pointer text-left after:absolute after:inset-0 after:rounded-control focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand"
                >
                  <span className="sr-only">Open </span>
                  {app.company}
                  <span className="sr-only">, {app.title}</span>
                </button>
              </p>
              <p className="m-0 text-xs leading-4 text-body">{app.title}</p>
            </div>
            {app.is_sample && <SampleBadge />}
            <Badge tone={state.tone}>{state.label}</Badge>
            <ChevronRight className="size-4 shrink-0 text-body" aria-hidden />
          </li>
        );
      })}
    </ul>
  );
}

/** The dashboard's Add application button, which opens the panel empty. */
export function AddApplicationButton() {
  const [adding, setAdding] = useState(false);
  return (
    <>
      <Button onClick={() => setAdding(true)}>
        <Plus className="size-4" aria-hidden />
        Add application
      </Button>
      <ApplicationPanel view={adding ? { kind: "add" } : null} applications={[]} onClose={() => setAdding(false)} />
    </>
  );
}
