"use client";

import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "cn";

/**
 * button-group.md: one bordered strip with an 8px radius and the only shadow; the buttons inside
 * share borders (each overlaps the one before by 1px) and have no shadow of their own. The picked
 * one is brand-soft with a brand border; a danger border shows when the group is aria-invalid.
 */
function ToggleGroup({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn("group/toggle-group inline-flex w-fit max-w-full rounded-control shadow-xs", className)}
      {...props}
    />
  );
}

function ToggleGroupItem({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        "relative -ml-px min-h-11 min-w-11 cursor-pointer border border-line-medium bg-surface-white px-3 py-2 text-sm font-medium text-heading transition-colors first:ml-0 first:rounded-s-control last:rounded-e-control",
        "hover:z-10 hover:border-line-brand-subtle hover:bg-brand-softer",
        "focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        "data-[state=on]:z-10 data-[state=on]:border-line-brand data-[state=on]:bg-brand-soft data-[state=on]:text-fg-brand-strong",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "group-aria-invalid/toggle-group:border-line-danger",
        className,
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
