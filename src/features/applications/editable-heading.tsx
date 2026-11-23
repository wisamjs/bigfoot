"use client";

import { Pencil } from "lucide-react";
import { useEffect, useRef, type FocusEvent, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SaveStatus } from "@/components/ui/save-status";
import type { SaveTracker } from "@/hooks/use-save-status";
import { summarize, type FieldErrors } from "@/lib/validation";

const titleClasses = "m-0 break-words text-[32px] font-bold leading-[1.1] text-heading md:text-[40px]";

/**
 * True when focus is going somewhere that still belongs to the form: one of its own fields or
 * buttons, or a popover one of them opened (a date picker's calendar), which renders at the end of
 * the page, outside the form, but is part of the edit.
 */
function staysInForm(form: HTMLElement, next: EventTarget | null) {
  if (!(next instanceof Element)) return false;
  return form.contains(next) || next.closest('[data-slot="popover-content"]') !== null;
}

/**
 * A page heading whose details are edited in place: the title (`title`, the h1) with `details`
 * under it and an edit button beside them, or, while `editing`, the fields passed as `children`
 * with Save and Cancel. Enter, Save, or leaving the form saves (`onSave`); Escape and Cancel put
 * back what was saved (`onCancel`). Moving into a popover a field opened, such as a date picker's
 * calendar, isn't leaving, and Escape there only closes the popover. When editing ends, focus goes
 * back to the edit button. The caller owns the values, their checks and the save itself.
 */
export function EditableHeading({
  title,
  details,
  editLabel,
  statusLabel,
  editing,
  onEdit,
  onSave,
  onCancel,
  tracker,
  errors,
  children,
}: {
  title: string;
  /** Under the title while it is shown, such as the role. */
  details: ReactNode;
  /** The edit button's accessible name, and the form's, such as "Edit company and title". */
  editLabel: string;
  /** What the save status is for, such as "Company and title". */
  statusLabel: string;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  tracker: SaveTracker;
  errors: FieldErrors;
  children: ReactNode;
}) {
  const editRef = useRef<HTMLButtonElement>(null);
  const wasEditingRef = useRef(editing);
  // Fields clear their own error as they're changed, leaving the key behind.
  const summary = summarize(errors);

  useEffect(() => {
    if (wasEditingRef.current && !editing) editRef.current?.focus();
    wasEditingRef.current = editing;
  }, [editing]);

  function submit(e: FormEvent) {
    e.preventDefault();
    onSave();
  }

  function blur(e: FocusEvent<HTMLFormElement>) {
    if (staysInForm(e.currentTarget, e.relatedTarget)) return;
    onSave();
  }

  function keyDown(e: KeyboardEvent<HTMLFormElement>) {
    // A popover's own keys reach here through React's tree: they work the popover, not the edit.
    if (!e.currentTarget.contains(e.target as Node)) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancel();
    } else if (e.key === "Enter" && e.target instanceof HTMLSelectElement) {
      // A select doesn't submit its form on Enter the way a text field does.
      e.preventDefault();
      onSave();
    }
  }

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className={titleClasses}>{title}</h1>
          {details}
          <SaveStatus status={tracker.status} label={statusLabel} onRetry={tracker.retry} />
        </div>
        <Button
          ref={editRef}
          variant="secondary"
          size="sm"
          className="shrink-0 px-2.5"
          onClick={onEdit}
          aria-label={editLabel}
        >
          <Pencil className="size-4" aria-hidden />
        </Button>
      </div>
    );
  }

  return (
    // A form only relays its fields' events here: Escape and focus leaving the fields.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <form onSubmit={submit} onBlur={blur} onKeyDown={keyDown} noValidate aria-label={editLabel} className="flex flex-col gap-4">
      <h1 className="sr-only">{title}</h1>
      {children}
      {summary && (
        <p role="alert" className="m-0 text-sm text-fg-danger">
          {summary}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm">
          Save
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <SaveStatus status={tracker.status} label={statusLabel} onRetry={tracker.retry} />
      </div>
    </form>
  );
}
