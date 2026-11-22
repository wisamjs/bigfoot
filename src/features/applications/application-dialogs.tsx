"use client";

import { useState, useTransition } from "react";
import { deleteApplicationAction } from "@/app/applications/actions";
import { Button } from "@/components/ui/button";
import type { Application } from "@/lib/applications";

/** The body of the Delete application? dialog: deletes only once confirmed. */
export function DeleteConfirmation({ app, onDone }: { app: Application; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteApplicationAction(app.id);
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4 pt-6">
      <p className="m-0 text-base leading-[1.625] text-body">
        <span className="font-medium text-heading">
          {app.company}, {app.title}
        </span>{" "}
        will be deleted. This can’t be undone.
      </p>
      {error && (
        <p role="alert" className="m-0 text-sm text-fg-danger">
          {error}
        </p>
      )}
      <div className="mt-2 flex justify-end gap-3 border-t border-line pt-4">
        <Button
          onClick={onDone}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- opening a delete dialog moves focus to its safe choice (WAI-ARIA dialog pattern).
          autoFocus
          variant="secondary"
        >
          Cancel
        </Button>
        <Button
          onClick={remove}
          disabled={isPending}
          variant="danger"
        >
          {isPending ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </div>
  );
}
