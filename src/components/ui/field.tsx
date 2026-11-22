import type { ReactNode } from "react";
import { FieldError } from "@/components/ui/fieldError";

/** A form field's label: above its control, in the heading colour. */
export const fieldLabelClasses = "mb-2 block text-sm font-medium text-heading";

/** The label's line when a status sits at its end: the label on the left, the status on the right. */
const fieldRowClasses = "mb-2 flex min-h-5 flex-wrap items-center justify-between gap-x-2 text-sm font-medium text-heading";

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
 * A field that saves itself passes its SaveStatus as `status`, shown at the end of the label's line.
 */
export function Field({
  id,
  label,
  required = false,
  error,
  status,
  className,
  children,
}: {
  /** The control's id; the error's is `${id}-error`. */
  id: string;
  label: ReactNode;
  required?: boolean;
  error?: string;
  /** Beside the label, for a field that saves itself. */
  status?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      {/* The mark sits beside the label, not in it, so the label's text is only its name. */}
      {status ? (
        <div className={fieldRowClasses}>
          <span>
            <label htmlFor={id}>{label}</label>
            {required && <RequiredMark />}
          </span>
          {status}
        </div>
      ) : (
        <div className={fieldLabelClasses}>
          <label htmlFor={id}>{label}</label>
          {required && <RequiredMark />}
        </div>
      )}
      {children}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}
