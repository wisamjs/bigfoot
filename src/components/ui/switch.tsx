"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "cn";

/**
 * shadcn/ui's Switch as Candy's toggle (radios-checkboxes-toggle.md): a fully rounded track in the
 * line colour, brand when on, card-strong when disabled, with a white thumb. Give it a
 * <label htmlFor> at least 44px tall: the label is the touch target, so the track itself opts out of
 * the 44px floor buttons get on touch screens.
 */
function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 min-h-0 w-11 min-w-0 shrink-0 cursor-pointer items-center rounded-full border border-transparent p-0.5 transition-colors",
        "bg-line-medium data-[state=checked]:bg-brand",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        "disabled:cursor-not-allowed disabled:bg-card-strong",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[18px] rounded-full border border-line bg-surface-white shadow-xs transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
