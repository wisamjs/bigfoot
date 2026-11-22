"use client";

import { useState, type FormEvent } from "react";
import { updateApplicationAction, type ActionResult } from "@/app/applications/actions";
import { RequiredNote } from "@/components/ui/field";
import type { SaveTracker } from "@/hooks/use-save-status";
import { DetailsFormActions } from "@/features/applications/details-form-actions";
import { DETAIL_FIELDS, DetailsFields, FormAlert, useDetails } from "@/features/applications/details-fields";
import type { Application } from "@/lib/applications";

/**
 * An Application's details, to edit on the Application page. They save together with one button, so a value
 * typed before leaving the page is never half-saved. Only the details that changed are sent.
 */
export function DetailsForm({
  app,
  salaryHidden = false,
  onRevealSalary,
  tracker,
}: {
  app: Application;
  /** Shows a Reveal button in place of the salary, against someone looking at the screen. */
  salaryHidden?: boolean;
  onRevealSalary?: () => void;
  /** Tracks the save; owned by the caller, so its status outlives this form remounting. */
  tracker: SaveTracker;
}) {
  const [saved] = useState(() => ({
    company: app.company,
    title: app.title,
    applied_on: app.applied_on,
    location: app.location ?? "",
    salary: app.salary ?? "",
    posting_url: app.posting_url ?? "",
  }));
  const details = useDetails(saved);
  const changed = DETAIL_FIELDS.filter((name) => details.values[name].trim() !== saved[name]);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // The submit button is only aria-disabled while saving, so it keeps focus; refuse a second submit here.
    if (tracker.saving) return;
    const fields = Object.fromEntries(changed.map((name) => [name, details.values[name].trim() || null]));
    if (!details.check(fields, { creating: false })) return;
    void tracker
      .run(() => updateApplicationAction(app.id, fields))
      .then((result: ActionResult) => {
        if (!result.ok) details.setFieldErrors(result.fieldErrors ?? {});
      });
  }

  return (
    // noValidate: the browser's own bubbles would stop the submit before these checks, which
    // show every problem at once, beside its field, in Bigfoot's words.
    <form onSubmit={submit} noValidate aria-labelledby={`${details.id}-heading`} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`${details.id}-heading`} className="m-0 text-base font-bold leading-[1.25] text-heading">
          Details
        </h2>
        <RequiredNote />
      </div>
      <DetailsFields details={details} app={app} salaryHidden={salaryHidden} onRevealSalary={onRevealSalary} />
      <FormAlert message={details.invalid} />
      <DetailsFormActions changed={changed.length > 0} tracker={tracker} />
    </form>
  );
}
