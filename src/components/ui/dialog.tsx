"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useEffect, useLayoutEffect, useRef, type ComponentProps } from "react";
import { cn } from "cn";

/**
 * shadcn/ui Dialog on Radix, styled per modals.md. Radix traps focus, closes on Escape and on a
 * backdrop click, and locks the page's scroll. InertOutside makes the page inert, and
 * returnFocusToOpener sends focus back to the control that opened the dialog.
 * src/components/modal.tsx builds Bigfoot's two dialogs from these.
 */
function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal(props: ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose(props: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

const CONTENT = "[data-slot$='-content']";
const OPEN_CONTENT = `${CONTENT}[data-state=open]`;

/**
 * The control that opened the open dialog. A dialog that replaces another (Delete application?
 * replacing the side panel) opens with focus nowhere, so it keeps the first one's.
 */
let opener: HTMLElement | null = null;

/**
 * Radix returns focus only to a <DialogTrigger>, and Bigfoot's dialogs open from state. Pass as
 * a Content's onCloseAutoFocus: focus goes back to the opener once no dialog is open.
 */
function returnFocusToOpener(event: Event) {
  event.preventDefault();
  if (document.querySelector(OPEN_CONTENT)) return;
  if (opener?.isConnected) opener.focus();
}

/**
 * Renders first inside dialog content while it is open. Notes the opener, and makes everything
 * outside the dialog inert, as a native modal <dialog> does. Radix only hides the page with
 * aria-hidden, which leaves it, and Radix's focus guards, focusable inside an aria-hidden region
 * (axe's aria-hidden-focus). Backdrops stay live so a click on one still lands.
 */
function InertOutside() {
  const ref = useRef<HTMLDivElement>(null);
  // A layout effect, and the content's first child, so it runs before React focuses an autoFocus
  // field further down: focus is still on the control that opened the dialog.
  useLayoutEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body && !active.closest(CONTENT)) opener = active;
  }, []);
  useEffect(() => {
    const made: Element[] = [];
    let live = true;
    // After this commit's other effects, which add Radix's focus guards to <body>.
    queueMicrotask(() => {
      if (!live) return;
      for (let node = ref.current?.parentElement; node && node !== document.body; node = node.parentElement) {
        for (const sibling of node.parentElement?.children ?? []) {
          if (sibling === node || sibling.hasAttribute("inert") || sibling.matches("script, [data-slot$='-overlay']")) continue;
          sibling.setAttribute("inert", "");
          made.push(sibling);
        }
      }
    });
    return () => {
      live = false;
      made.forEach((el) => el.removeAttribute("inert"));
    };
  }, []);
  return <div ref={ref} hidden />;
}

/** modals.md backdrop: black at 50%, slightly blurred. */
function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

/** modals.md container, centred. Pass `overlayClassName` to change the backdrop. */
function DialogContent({
  className,
  overlayClassName,
  children,
  showCloseButton = true,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { overlayClassName?: string; showCloseButton?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        onCloseAutoFocus={returnFocusToOpener}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card border border-line bg-surface-white p-5 text-body shadow-2xl outline-none duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        <InertOutside />
        {children}
        {showCloseButton && <DialogCloseButton className="absolute right-4 top-4" />}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/** modals.md close button: ghost, 6px padding, an X labelled Close. */
function DialogCloseButton({ className, ...props }: ComponentProps<typeof DialogPrimitive.Close>) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      aria-label="Close"
      className={cn("rounded-control p-1.5 text-body transition-colors hover:bg-card hover:text-heading", className)}
      {...props}
    >
      <X className="size-5" aria-hidden />
    </DialogPrimitive.Close>
  );
}

/** modals.md title: 20px, bold, heading colour. */
function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("m-0 text-xl font-bold leading-[1.25] text-heading", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("m-0 text-sm leading-5 text-body", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  InertOutside,
  returnFocusToOpener,
};
