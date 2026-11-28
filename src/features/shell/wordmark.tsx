import { Footprints } from "lucide-react";
import { HeaderBigfoot } from "@/features/shell/illustrations";

/** What sits before the name: a bare footprint, the footprint on a rounded tile (the Journey header, BIG-173), or Bigfoot (the signed-in header). */
type Mark = "footprint" | "tile" | "bigfoot";

/**
 * Text mark: job hunting is chasing Bigfoot. The footprint matches src/app/icon.svg.
 * `compact` keeps only the mark on phones, where a busy header has no room for the name;
 * the link around it must then carry an aria-label.
 */
export function Wordmark({ compact = false, mark = "footprint" }: { compact?: boolean; mark?: Mark }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-xl font-bold tracking-[-0.01em] text-heading">
      <WordmarkMark mark={mark} />
      <span className={compact ? "max-sm:sr-only" : undefined}>Bigfoot</span>
    </span>
  );
}

function WordmarkMark({ mark }: { mark: Mark }) {
  if (mark === "bigfoot") return <HeaderBigfoot className="h-12 w-auto" />;
  const footprint = <Footprints className="size-5 text-fg-brand" aria-hidden />;
  if (mark === "tile") return <span className="grid size-8 place-items-center rounded-control bg-card-strong">{footprint}</span>;
  return footprint;
}
