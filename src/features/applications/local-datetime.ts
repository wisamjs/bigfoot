/** An ISO timestamp as the viewer's local date and time, for a datetime-local input. */
export function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/**
 * A datetime-local value (the viewer's local time) as an ISO timestamp; blank is no date. A value
 * that isn't a date is passed through as typed, for interviewErrors to refuse.
 */
export function fromLocalInput(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

/** Today in the viewer's time zone, for a date input. */
export function todayLocal() {
  return toLocalInput(new Date().toISOString()).slice(0, 10);
}
