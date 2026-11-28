import { Footprints } from "lucide-react";
import { HeaderBigfoot } from "@/features/shell/illustrations";

/**
 * Text mark plus a footprint: job hunting is chasing Bigfoot. Matches src/app/icon.svg.
 * `compact` keeps only the footprint on phones, where a busy header has no room for the name;
 * the link around it must then carry an aria-label. `tile` sets the footprint on a rounded tile,
 * as the Journey header does (BIG-173). `bigfoot` puts the Bigfoot sprite in the footprint's place, as the
 * signed-in header does.
 */
export function Wordmark({ compact = false, tile = false, bigfoot = false }: { compact?: boolean; tile?: boolean; bigfoot?: boolean }) {
  const footprint = bigfoot ? (
    <HeaderBigfoot className="h-12 w-auto" />
  ) : (
    <Footprints className="size-5 text-fg-brand" aria-hidden />
  );
  return (
    <span className="inline-flex items-center gap-2.5 text-xl font-bold tracking-[-0.01em] text-heading">
      {tile && !bigfoot ? <span className="grid size-8 place-items-center rounded-control bg-card-strong">{footprint}</span> : footprint}
      <span className={compact ? "max-sm:sr-only" : undefined}>Bigfoot</span>
    </span>
  );
}
