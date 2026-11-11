"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** True after hydration. Dates depend on the viewer's time zone, which the server doesn't know. */
export function useIsClient() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

const format = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** A timestamp in the viewer's time zone, e.g. "Mon, Nov 16, 10:00 AM". */
export function LocalTime({ iso }: { iso: string }) {
  const isClient = useIsClient();
  return <time dateTime={iso}>{isClient ? format.format(new Date(iso)) : " "}</time>;
}
