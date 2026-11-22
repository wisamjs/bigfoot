import type { ReactNode } from "react";
import { FieldError } from "@/components/ui/field-error";

/** A form field's label: above its control, in the heading colour. */
export const fieldLabelClasses = "mb-2 block text-sm font-medium text-heading";

/**
 * The red * after a required field's label. Hidden from screen readers, which hear "required"
 * from the control's own `required` attribute instead.
 */
export function RequiredMark() {
  return (
    <span aria-hidden className="ml-0.5 text-fg-danger">
      *
    </span>
  );
}

/**
 * "* Required", once per form, above its fields: what the red * after a label means. Hidden
 * from screen readers, like the marks it explains.
 */
export function RequiredNote({ className }: { className?: string }) {
  return (
    <p aria-hidden className={`m-0 text-xs text-body ${className ?? ""}`}>
      <span className="text-fg-danger">*</span> Required
    </p>
  );
}

/**
 * A labelled form field: the label, the control passed as `children`, and the field's error
 * under it. The control takes `id`, and `invalidProps(`${id}-error`, error)` so the error is read
 * with the label. A `required` field shows a RequiredMark; the control still needs `required`.
 */
export function Field({
  id,
  label,
  required = false,
  error,
  className,
  children,
}: {
  /** The control's id; the error's is `${id}-error`. */
  id: string;
  label: ReactNode;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      {/* The mark sits beside the label, not in it, so the label's text is only its name. */}
      <div className={fieldLabelClasses}>
        <label htmlFor={id}>{label}</label>
        {required && <RequiredMark />}
      </div>
      {children}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}
