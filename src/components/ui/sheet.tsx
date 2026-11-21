"use client";

import { cn } from "cn";
import { Dialog as SheetPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { DialogCloseButton, DialogDescription, DialogTitle, InertOutside, returnFocusToOpener } from "./dialog";

/**
 * shadcn/ui Sheet: a Radix Dialog docked to the right edge at full height, so the page stays
 * visible beside it; at phone width it covers the screen. Its backdrop is lighter than Dialog's
 * and not blurred, so the page behind can still be read.
 */
function Sheet(props: ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetContent({ className, children, ...props }: ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay
        data-slot="sheet-overlay"
        className="fixed inset-0 z-40 bg-black/30 data-[state=open]:animate-in data-[state=open]:fade-in-0"
      />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        onCloseAutoFocus={returnFocusToOpener}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex h-dvh w-full flex-col border-line bg-surface-white text-body shadow-2xl outline-none duration-300 data-[state=open]:animate-in data-[state=open]:slide-in-from-right sm:w-[36rem] sm:rounded-l-card sm:border-l",
          className,
        )}
        {...props}
      >
        <InertOutside />
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

const SheetCloseButton = DialogCloseButton;
const SheetTitle = DialogTitle;
const SheetDescription = DialogDescription;

export { Sheet, SheetClose, SheetCloseButton, SheetContent, SheetDescription, SheetTitle, SheetTrigger };
