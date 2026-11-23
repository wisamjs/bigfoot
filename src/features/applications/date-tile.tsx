"use client";

import { useIsClient } from "@/hooks/use-is-client";

const monthFormat = new Intl.DateTimeFormat(undefined, { month: "short" });

const TONES = {
  /** The next Interview: filled with the brand colour. */
  brand: "border-transparent bg-brand text-on-brand",
  /** An Interview still ahead. */
  outline: "border-line-medium text-heading",
  /** A completed Interview. */
  muted: "border-transparent bg-surface text-heading",
};

/**
 * An Interview's month and day as a small calendar tile ("NOV / 25"), in the viewer's time zone.
 * Decorative: the date is always written out beside it, so screen readers skip the tile. "?" for an
 * Interview saved with no date (docs/adr/0005).
 */
export function DateTile({ at, tone = "outline", className = "" }: { at: string | null; tone?: keyof typeof TONES; className?: string }) {
  const isClient = useIsClient();
  const date = at && isClient ? new Date(at) : null;
  return (
    <span
      aria-hidden
      className={`flex size-14 shrink-0 flex-col items-center justify-center rounded-card border leading-none ${TONES[tone]} ${className}`}
    >
      <span className="text-[11px] font-bold uppercase tracking-[0.06em]">
        {date ? monthFormat.format(date) : ""}
      </span>
      <span className="mt-1 text-xl font-bold">{date ? date.getDate() : at ? "" : "?"}</span>
    </span>
  );
}
