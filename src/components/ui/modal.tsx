"use client";

import type { ReactNode } from "react";
import { Dialog, DialogCloseButton, DialogContent, DialogTitle } from "@/components/ui/dialog";

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
