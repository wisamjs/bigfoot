import { Footprints } from "lucide-react";

/**
 * Text mark plus a footprint: job hunting is chasing Bigfoot. Matches src/app/icon.svg.
 * `compact` keeps only the footprint on phones, where a busy header has no room for the name;
 * the link around it must then carry an aria-label.
 */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-xl font-bold text-heading">
      <Footprints className="size-5 text-fg-brand" aria-hidden />
      <span className={compact ? "max-sm:sr-only" : undefined}>Bigfoot</span>
    </span>
  );
}
