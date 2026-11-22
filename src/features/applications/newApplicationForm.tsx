"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createApplicationAction, type CreateApplicationResult } from "@/app/applications/actions";
import { RequiredNote } from "@/components/ui/field";
import { useIsClient } from "@/hooks/useIsClient";
import { useSaveStatus } from "@/hooks/useSaveStatus";
import { AddFormActions } from "@/features/applications/addFormActions";
import { DETAIL_FIELDS, DetailsFields, FormAlert, useDetails } from "@/features/applications/detailsFields";
import { todayLocal } from "@/features/applications/localDatetime";
import { applicationHref } from "@/features/applications/routes";
import { UnsavedChanges, useUnsavedChanges } from "@/features/applications/unsavedChanges";

/**
 * The details of an Application that doesn't exist yet, on the Add Application page. Applied
 * starts at today. Adding it creates the Application and opens its page. Leaving with any detail
 * filled in asks first.
 */
export function NewApplicationForm() {
  return (
    <UnsavedChanges>
      <NewApplicationFields />
    </UnsavedChanges>
  );
}

function NewApplicationFields() {
  const router = useRouter();
  const tracker = useSaveStatus();
  const typed = useDetails({ company: "", title: "", applied_on: "", location: "", salary: "", posting_url: "" });
  // Today is the viewer's, which the server doesn't know: until hydration, Applied shows no date.
  const isClient = useIsClient();
  const values = { ...typed.values, applied_on: typed.values.applied_on || (isClient ? todayLocal() : "") };
  const details = { ...typed, values };
  // Once it's added, the page is on its way to the new Application: nothing is lost by leaving.
  const [added, setAdded] = useState(false);
  const filledIn = DETAIL_FIELDS.find((name) => typed.values[name] !== "");
  useUnsavedChanges(!added && filledIn !== undefined, () => {
    if (filledIn) document.getElementById(`${typed.id}-${filledIn}`)?.focus();
  });

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // The submit button is only aria-disabled while saving, so it keeps focus; refuse a second submit here.
    if (tracker.saving) return;
    const fields = Object.fromEntries(DETAIL_FIELDS.map((name) => [name, values[name].trim() || null]));
    if (!details.check(fields, { creating: true })) return;
    void tracker
      .run(() => createApplicationAction(fields))
      .then((result: CreateApplicationResult) => {
        if (!result.ok) details.setFieldErrors(result.fieldErrors ?? {});
        else if ("id" in result) {
          setAdded(true);
          router.push(applicationHref(result.id, { added: true }));
        }
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
