"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * modals.md: a native <dialog> opened with showModal(), which provides the backdrop,
 * focus trap, Escape to close and inert background.
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
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto w-[calc(100%-32px)] max-w-md rounded-card border border-line bg-surface-white p-5 text-body shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
        <h2 id={titleId} className="m-0 text-xl font-bold leading-[1.25] text-heading">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-control p-1.5 text-body transition-colors hover:bg-card hover:text-heading"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      {open && children}
    </dialog>
  );
}
