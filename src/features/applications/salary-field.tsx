"use client";

import { Eye } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import { Button } from "@/components/ui/button";
import { Field, fieldLabelClasses } from "@/components/ui/field";

/**
 * An Application's salary in the details form. While `hidden`, it shows "Hidden" and a Reveal
 * button instead, against someone looking at the screen; once revealed, focus moves to the field.
 */
export function SalaryField({
  id,
  error,
  hidden,
  onReveal,
  input,
}: {
  /** The input's id, as `Field` takes it. */
  id: string;
  error: string | undefined;
  hidden: boolean;
  onReveal?: () => void;
  /** The input's props from the form: value, change handler, validation. */
  input: InputHTMLAttributes<HTMLInputElement>;
}) {
  // Only after Reveal is pressed: a form remounted by a save must not pull focus to the salary.
  // Reveal swaps this component's children, not the component, so this survives the swap.
  const [focusOnShow, setFocusOnShow] = useState(false);

  if (hidden) {
    return (
      <fieldset aria-labelledby={`${id}-label`} className="m-0 min-w-0 border-0 p-0">
        <span id={`${id}-label`} className={fieldLabelClasses}>
          Salary (optional)
        </span>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-body">Hidden</span>
          <Button
            onClick={() => {
              setFocusOnShow(true);
              onReveal?.();
            }}
            variant="secondary"
          >
            <Eye className="size-4" aria-hidden />
            Reveal
          </Button>
        </div>
      </fieldset>
    );
  }

  return (
    <Field id={id} label="Salary (optional)" error={error}>
      {/* eslint-disable-next-line jsx-a11y/no-autofocus -- Reveal swaps its button for this field, so focus follows it. */}
      <input type="text" placeholder="$150k–$180k" autoFocus={focusOnShow} {...input} />
    </Field>
  );
}
