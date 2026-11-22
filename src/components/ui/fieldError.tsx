/** A field's own error, under it; the field names it with aria-describedby (see `invalidProps`). */
export function FieldError({ id, error }: { id: string; error: string | undefined }) {
  if (!error) return null;
  return (
    <p id={id} className="m-0 mt-1 text-sm text-fg-danger">
      {error}
    </p>
  );
}

/** Props that tie a field to its FieldError, so screen readers read the error with the label. */
export function invalidProps(errorId: string, error: string | undefined) {
  return error ? { "aria-invalid": true, "aria-describedby": errorId } : {};
}
