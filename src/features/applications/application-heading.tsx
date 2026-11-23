"use client";

import { useId, useRef, useState } from "react";
import { updateApplicationAction } from "@/app/applications/actions";
import { Field } from "@/components/ui/field";
import { invalidProps } from "@/components/ui/field-error";
import { inputClasses } from "@/components/ui/input";
import { useSaveStatus } from "@/hooks/use-save-status";
import { EditableHeading } from "@/features/applications/editable-heading";
import { useUnsavedChanges } from "@/features/applications/unsaved-changes";
import { PLACEHOLDERS } from "@/features/applications/placeholders";
import { APPLICATION_MAX_LENGTHS, type Application } from "@/lib/applications";
import { applicationErrors, isValid, type FieldErrors } from "@/lib/validation";

type Identity = { company: string; title: string };

/**
 * The Application page's heading: the company, with the title under it, and an edit button that
 * turns both into fields in place (EditableHeading). Enter, Save, or leaving the pair saves them
 * together, checked first with the API's rules; a problem shows beside its field, keeps what was
 * typed and sends nothing. Escape and Cancel put back what was saved. Leaving the page with the
 * pair typed but not saved asks first (UnsavedChanges).
 */
export function ApplicationHeading({ app }: { app: Application }) {
  const id = useId();
  const saved: Identity = { company: app.company, title: app.title };
  const [shown, setShown] = useState(saved);
  const [seen, setSeen] = useState(saved);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(saved);
  const [errors, setErrors] = useState<FieldErrors>({});
  const tracker = useSaveStatus();
  const companyRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Taken in when it changes elsewhere, set during render the way React advises for state that follows a prop.
  if (saved.company !== seen.company || saved.title !== seen.title) {
    setSeen(saved);
    setShown(saved);
  }

  const changed = editing && (values.company.trim() !== shown.company || values.title.trim() !== shown.title);
  useUnsavedChanges(changed, () => (errors.title && !errors.company ? titleRef : companyRef).current?.focus());

  function startEditing() {
    setValues(shown);
    setErrors({});
    setEditing(true);
  }

  function stopEditing() {
    setEditing(false);
    setErrors({});
  }

  async function save() {
    if (tracker.saving) return;
    const next = { company: values.company.trim(), title: values.title.trim() };
    if (next.company === shown.company && next.title === shown.title) {
      stopEditing();
      return;
    }
    const problems = applicationErrors(next, { creating: false });
    setErrors(problems);
    if (!isValid(problems)) {
      (problems.company ? companyRef : titleRef).current?.focus();
      return;
    }
    const result = await tracker.run(async () => {
      const outcome = await updateApplicationAction(app.id, next);
      if (!outcome.ok && outcome.fieldErrors) setErrors(outcome.fieldErrors);
      return outcome;
    });
    if (result.ok) {
      setShown(next);
      stopEditing();
    }
  }

  function input(name: keyof Identity, ref: typeof companyRef) {
    return {
      ref,
      id: `${id}-${name}`,
      value: values[name],
      onChange: (e: { target: { value: string } }) => {
        setValues((prev) => ({ ...prev, [name]: e.target.value }));
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      },
      maxLength: APPLICATION_MAX_LENGTHS[name],
      placeholder: PLACEHOLDERS[name],
      className: inputClasses,
      ...invalidProps(`${id}-${name}-error`, errors[name]),
    };
  }

  return (
    <EditableHeading
      title={shown.company}
      details={<p className="m-0 mt-2 break-words text-base leading-[1.7] text-body">{shown.title}</p>}
      editLabel="Edit company and title"
      statusLabel="Company and title"
      editing={editing}
      onEdit={startEditing}
      onSave={() => void save()}
      onCancel={() => {
        setValues(shown);
        stopEditing();
      }}
      tracker={tracker}
      errors={errors}
    >
      <Field label="Company" required id={`${id}-company`} error={errors.company}>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus -- Pressing the edit button is the request to type here. */}
        <input type="text" required autoFocus {...input("company", companyRef)} />
      </Field>
      <Field label="Title" required id={`${id}-title`} error={errors.title}>
        <input type="text" required {...input("title", titleRef)} />
      </Field>
    </EditableHeading>
  );
}
