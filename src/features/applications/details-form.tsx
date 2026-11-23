"use client";

import { useState } from "react";
import { updateApplicationAction } from "@/app/applications/actions";
import { RequiredNote } from "@/components/ui/field";
import { SaveStatus } from "@/components/ui/save-status";
import { useSaveStatus } from "@/hooks/use-save-status";
import { useUnsavedChanges } from "@/features/applications/unsaved-changes";
import {
  DETAIL_FIELDS,
  DetailsFields,
  FormAlert,
  type DetailField,
  type DetailValues,
  useDetails,
} from "@/features/applications/details-fields";
import type { Application } from "@/lib/applications";

/** The details this form edits: all but Company and Title, which the page's heading edits. */
const PAGE_DETAIL_FIELDS = DETAIL_FIELDS.filter((name) => name !== "company" && name !== "title");

/** What screen readers hear before each detail's save status. */
const LABELS: Record<DetailField, string> = {
  company: "Company",
  title: "Title",
  applied_on: "Applied date",
  location: "Location",
  posting_url: "Job posting URL",
};

/** The details as the Application has them saved: what each field is compared with when it's left. */
function savedDetails(app: Application): DetailValues {
  return {
    company: app.company,
    title: app.title,
    applied_on: app.applied_on,
    location: app.location ?? "",
    posting_url: app.posting_url ?? "",
  };
}

/**
 * An Application's details but its Company and Title, to edit on the Application page. Each detail saves by itself when it's
 * left (the applied date, when it's picked), and only if it changed, so every value saved was
 * checked first and nothing typed waits on a button. A detail that fails its check shows why beside
 * it, keeps what was typed, and isn't sent. Each has its own save status, beside its label.
 *
 * The form isn't remounted by a save: a detail only takes the saved value in when it changes
 * elsewhere and nothing was typed over the old one, so a save never resets a field being typed in.
 */
export function DetailsForm({ app }: { app: Application }) {
  const saved = savedDetails(app);
  const [seen, setSeen] = useState(saved);
  const details = useDetails(saved);
  // One tracker per detail, here so its status outlives the field being re-rendered by the save.
  const saves: Record<DetailField, ReturnType<typeof useSaveStatus>> = {
    company: useSaveStatus(),
    title: useSaveStatus(),
    applied_on: useSaveStatus(),
    location: useSaveStatus(),
    posting_url: useSaveStatus(),
  };

  // Set during render, the way React advises for state that follows a prop.
  const elsewhere = DETAIL_FIELDS.filter((name) => saved[name] !== seen[name]);
  if (elsewhere.length > 0) {
    setSeen(saved);
    const untouched = elsewhere.filter((name) => details.values[name].trim() === seen[name]);
    details.adopt(Object.fromEntries(untouched.map((name) => [name, saved[name]])));
  }

  // A detail typed but not yet left, one that failed its check, or one whose save failed: each
  // still differs from what's saved. Company and Title are the heading's, not this form's.
  const unsavedDetail = PAGE_DETAIL_FIELDS.find((name) => details.values[name].trim() !== saved[name]);
  useUnsavedChanges(unsavedDetail !== undefined, () => {
    if (unsavedDetail) document.getElementById(`${details.id}-${unsavedDetail}`)?.focus();
  });

  function commit(name: DetailField, value: string) {
    const next = value.trim();
    if (next === saved[name]) return;
    if (!details.checkField(name, next || null)) return;
    void saves[name].run(async () => {
      const result = await updateApplicationAction(app.id, {
        [name]: next || null,
      });
      if (!result.ok && result.fieldErrors) details.setFieldErrors((prev) => ({ ...prev, ...result.fieldErrors }));
      return result;
    });
  }

  return (
    <section aria-labelledby={`${details.id}-heading`} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`${details.id}-heading`} className="m-0 text-base font-bold leading-[1.25] text-heading">
          Details
        </h2>
        <RequiredNote />
      </div>
      <DetailsFields
        details={details}
        app={app}
        identity={false}
        onCommit={commit}
        status={(name) => <SaveStatus status={saves[name].status} label={LABELS[name]} onRetry={saves[name].retry} />}
      />
      <FormAlert message={details.invalid} />
    </section>
  );
}
