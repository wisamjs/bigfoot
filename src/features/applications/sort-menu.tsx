"use client";

import { ArrowUpDown, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APPLICATION_SORT_LABELS, APPLICATION_SORTS, parseApplicationSort, type ApplicationSort } from "@/lib/applications";

/**
 * The Applications list's "Sort by" menu (BIG-209), on a phone, where the table's column headers
 * are hidden: a menu like Mark done….
 */
export function SortMenu({ sort, onSort }: { sort: ApplicationSort; onSort: (sort: ApplicationSort) => void }) {
  // The menu opens inside the page's main landmark, not at the end of <body>.
  const [container, setContainer] = useState<HTMLElement | null>(null);
  return (
    <div ref={setContainer} className="relative sm:hidden">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" aria-label={`Sort by ${APPLICATION_SORT_LABELS[sort]}`}>
            <ArrowUpDown className="size-4" aria-hidden />
            {APPLICATION_SORT_LABELS[sort]}
            <ChevronDown className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" container={container}>
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sort} onValueChange={(value) => onSort(parseApplicationSort(value))}>
            {APPLICATION_SORTS.map((option) => (
              <DropdownMenuRadioItem key={option} value={option}>
                {APPLICATION_SORT_LABELS[option]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
