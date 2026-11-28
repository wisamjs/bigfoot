"use client";

import { ChevronDown, Funnel, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { parseProgressFilter, PROGRESS_LABELS, PROGRESS_VALUES, type ProgressFilter } from "@/lib/applications";

// The Applications page's Progress filter (BIG-252): a toggle group on wide screens, a menu button in
// the card's toolbar below `lg`. Both offer All and each Progress value that has Applications, with
// its count.

type FilterProps = {
  progress: ProgressFilter;
  counts: Record<ProgressFilter, number>;
  onProgress: (progress: ProgressFilter) => void;
};

/** "All", or the Progress value's name. */
export function progressLabel(progress: ProgressFilter): string {
  return progress === "all" ? "All" : PROGRESS_LABELS[progress];
}

/** All, then each Progress value with Applications, in Progress order. */
function choices(counts: Record<ProgressFilter, number>): ProgressFilter[] {
  return ["all", ...PROGRESS_VALUES.filter((progress) => counts[progress] > 0)];
}

/** The filter on wide screens (`lg` and up): "Progress", then a toggle group, one item per choice and its count. */
export function ProgressToggleGroup({ progress, counts, onProgress }: FilterProps) {
  const labelId = useId();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span id={labelId} className="text-sm font-medium text-heading">
        Progress
      </span>
      <ToggleGroup
        type="single"
        aria-labelledby={labelId}
        value={progress}
        // Pressing the picked item again would unpick it: the filter always has a value.
        onValueChange={(value) => value && onProgress(parseProgressFilter(value))}
      >
        {choices(counts).map((choice) => (
          <ToggleGroupItem key={choice} value={choice} className="group/item whitespace-nowrap">
            {progressLabel(choice)}{" "}
            <span className="font-normal text-body group-data-[state=on]/item:text-fg-brand-strong">{counts[choice]}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

/**
 * The filter below `lg`: a menu button showing the current choice ("Filter: Waiting"), in the picked
 * look while a value other than All is picked, opening "Filter by Progress" with each choice and its
 * count, All set off first.
 */
export function ProgressMenu({ progress, counts, onProgress }: FilterProps) {
  // The menu opens inside the page's main landmark, not at the end of <body>.
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const labelId = useId();
  const [all, ...values] = choices(counts);
  const filtered = progress !== "all";
  const item = (choice: ProgressFilter) => (
    <DropdownMenuRadioItem key={choice} value={choice}>
      {progressLabel(choice)}
      <span className="ml-auto pl-4 text-body">{counts[choice]}</span>
    </DropdownMenuRadioItem>
  );
  return (
    <div ref={setContainer} className="relative">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            aria-label={`Filter: ${progressLabel(progress)}`}
            className={filtered ? "border-line-brand bg-brand-soft text-fg-brand-strong hover:bg-brand-soft" : undefined}
          >
            <Funnel className="size-4" aria-hidden />
            {progressLabel(progress)}
            <ChevronDown className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          // Named by its heading rather than by the button, as Radix would: "Filter by Progress".
          aria-labelledby={labelId}
          align="start"
          collisionPadding={16}
          container={container}
          className="max-w-[calc(100vw-2rem)]"
        >
          <DropdownMenuLabel id={labelId}>Filter by Progress</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={progress} onValueChange={(value) => onProgress(parseProgressFilter(value))}>
            {item(all)}
            {values.length > 0 && <DropdownMenuSeparator />}
            {values.map(item)}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * While filtered: "Showing 7 of 13" ("Showing 4 Done" for Done, which All doesn't count), announced
 * politely, and Clear filter, back to All. The live region stays in place while unfiltered, empty,
 * so the first filter is announced too.
 */
export function FilterStatus({
  progress,
  shown,
  counts,
  onProgress,
  className = "",
}: FilterProps & { shown: number; className?: string }) {
  const text = progress === "all" ? "" : progress === "done" ? `Showing ${shown} Done` : `Showing ${shown} of ${counts.all}`;
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <p aria-live="polite" className="m-0 text-sm text-body">
        {text}
      </p>
      {progress !== "all" && <ClearFilter onClear={() => onProgress("all")} />}
    </div>
  );
}

/** Clear filter: back to All. A tertiary button, or the brand one where it is the view's call to action. */
export function ClearFilter({ onClear, variant = "tertiary" }: { onClear: () => void; variant?: "tertiary" | "brand" }) {
  return (
    <Button variant={variant} onClick={onClear}>
      <X className="size-4" aria-hidden />
      Clear filter
    </Button>
  );
}
