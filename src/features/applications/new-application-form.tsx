"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { createApplicationAction, type ActionResult } from "@/app/applications/actions";
import { RequiredNote } from "@/components/ui/field";
import { useIsClient } from "@/hooks/use-is-client";
import { useSaveStatus } from "@/hooks/use-save-status";
import { AddFormActions } from "@/features/applications/add-form-actions";
import { DETAIL_FIELDS, DetailsFields, FormAlert, useDetails } from "@/features/applications/details-fields";
import { todayLocal } from "@/features/applications/local-datetime";

/**
 * The details of an Application that doesn't exist yet, on the Add Application page. Applied
 * starts at today. Adding it creates the Application and goes back to the dashboard.
 */
export function NewApplicationForm() {
  const router = useRouter();
  const tracker = useSaveStatus();
  const typed = useDetails({ company: "", title: "", applied_on: "", location: "", salary: "", posting_url: "" });
  // Today is the viewer's, which the server doesn't know: until hydration, Applied shows no date.
  const isClient = useIsClient();
  const values = { ...typed.values, applied_on: typed.values.applied_on || (isClient ? todayLocal() : "") };
  const details = { ...typed, values };

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // The submit button is only aria-disabled while saving, so it keeps focus; refuse a second submit here.
    if (tracker.saving) return;
    const fields = Object.fromEntries(DETAIL_FIELDS.map((name) => [name, values[name].trim() || null]));
    if (!details.check(fields, { creating: true })) return;
    void tracker
      .run(() => createApplicationAction(fields))
      .then((result: ActionResult) => {
        if (!result.ok) details.setFieldErrors(result.fieldErrors ?? {});
        else router.push("/dashboard");
      });
  }

  return (
    // noValidate: the browser's own bubbles would stop the submit before these checks, which
    // show every problem at once, beside its field, in Bigfoot's words.
    <form onSubmit={submit} noValidate aria-label="New Application" className="flex flex-col gap-4">
      <RequiredNote />
      <DetailsFields details={details} />
      <FormAlert message={details.invalid} />
      <AddFormActions tracker={tracker} label="New Application" submitText="Add Application" />
    </form>
  );
}
