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
 * Decorative: the date is always written out beside it, so screen readers skip the tile.
 */
export function DateTile({ at, tone = "outline", className = "" }: { at: string; tone?: keyof typeof TONES; className?: string }) {
  const isClient = useIsClient();
  const date = isClient ? new Date(at) : null;
  return (
    <span
      aria-hidden
      className={`flex size-14 shrink-0 flex-col items-center justify-center gap-1.5 rounded-control border ${TONES[tone]} ${className}`}
    >
      {/* leading-none on both lines, so the glyphs, not their line boxes, are what gets centred;
          pl matches the tracking after the last letter, so the month centres too. */}
      <span className="pl-[0.06em] text-[11px] leading-none font-bold uppercase tracking-[0.06em]">
        {date ? monthFormat.format(date) : ""}
      </span>
      <span className="text-xl leading-none font-bold">{date ? date.getDate() : ""}</span>
    </span>
  );
}
