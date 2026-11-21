"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Dialog, DialogCloseButton, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetCloseButton, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

/**
 * modals.md: a centred dialog, for short confirmations. Escape, the Close button and a click on
 * the backdrop all ask to close.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {/* No description: the title names the dialog and its content explains itself. */}
      <DialogContent showCloseButton={false} aria-describedby={undefined}>
        <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogCloseButton />
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/**
 * A side panel for reading and editing: a Sheet docked to the right edge. Escape and the Close
 * button ask to close; a click on the page behind does not, so a stray click can't lose edits.
 */
export function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  onBack,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Shows a Back to list button above the title. */
  onBack?: () => void;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        onInteractOutside={(event) => event.preventDefault()}
        {...(subtitle ? {} : { "aria-describedby": undefined })}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div className="min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                // The list item that was clicked is gone, so focus moves here, not to the page.
                // eslint-disable-next-line jsx-a11y/no-autofocus -- replaces focus lost inside the open dialog.
                autoFocus
                className="mb-2 flex items-center gap-1.5 rounded-control text-sm font-medium text-fg-brand hover:underline"
              >
                <ArrowLeft className="size-4" aria-hidden />
                Back to list
              </button>
            )}
            <SheetTitle>{title}</SheetTitle>
            {subtitle && <SheetDescription className="mt-1">{subtitle}</SheetDescription>}
          </div>
          <SheetCloseButton />
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
