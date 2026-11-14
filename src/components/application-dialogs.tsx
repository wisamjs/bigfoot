"use client";

import { Plus } from "lucide-react";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { createApplicationAction, deleteApplicationAction } from "@/app/dashboard/actions";
import { Modal } from "@/components/modal";
import { buttonClasses, dangerButtonClasses, inputClasses } from "@/components/ui";
import type { Application } from "@/lib/applications";

const formInput = inputClasses;

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-heading">
        {label}
      </label>
      {children}
    </div>
  );
}

/** The dashboard's Add application button and its dialog. */
export function AddApplicationButton() {
  const [adding, setAdding] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAdding(true)} className={buttonClasses("brand", "md")}>
        <Plus className="size-4" aria-hidden />
        Add application
      </button>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add application">
        <AddApplicationForm onDone={() => setAdding(false)} />
      </Modal>
    </>
  );
}

function todayLocal() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function AddApplicationForm({ onDone }: { onDone: () => void }) {
  const [today] = useState(todayLocal);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim() || null;
    startTransition(async () => {
      const result = await createApplicationAction({
        company: text("company") ?? "",
        title: text("title") ?? "",
        posting_url: text("posting_url"),
        applied_on: text("applied_on") ?? today,
      });
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pt-6">
      <Field id="new-company" label="Company">
        <input id="new-company" name="company" required autoFocus className={formInput} />
      </Field>
      <Field id="new-title" label="Title">
        <input id="new-title" name="title" required className={formInput} />
      </Field>
      <Field id="new-posting-url" label="Job posting URL (optional)">
        <input id="new-posting-url" name="posting_url" type="url" placeholder="https://" className={formInput} />
      </Field>
      <Field id="new-applied-on" label="Applied">
        <input id="new-applied-on" name="applied_on" type="date" required defaultValue={today} className={formInput} />
      </Field>
      {error && (
        <p role="alert" className="m-0 text-sm text-fg-danger">
          {error}
        </p>
      )}
      <div className="mt-2 flex justify-end gap-3 border-t border-line pt-4">
        <button type="button" onClick={onDone} className={buttonClasses("secondary", "md")}>
          Cancel
        </button>
        <button type="submit" disabled={isPending} className={`${buttonClasses("brand", "md")} disabled:opacity-60`}>
          {isPending ? "Adding…" : "Add application"}
        </button>
      </div>
    </form>
  );
}

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
        <button type="button" onClick={onDone} autoFocus className={buttonClasses("secondary", "md")}>
          Cancel
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={isPending}
          className={dangerButtonClasses}
        >
          {isPending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
