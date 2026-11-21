import type { ReactNode } from "react";
import { FieldError } from "@/components/ui/field-error";

/** A form field's label: above its control, in the heading colour. */
export const fieldLabelClasses = "mb-2 block text-sm font-medium text-heading";

/**
 * A labelled form field: the label, the control passed as `children`, and the field's error
 * under it. The control takes `id`, and `invalidProps(`${id}-error`, error)` so the error is read
 * with the label.
 */
export function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  /** The control's id; the error's is `${id}-error`. */
  id: string;
  label: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={fieldLabelClasses}>
        {label}
      </label>
      {children}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}
