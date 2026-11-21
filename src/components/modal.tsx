"use client";

import { ArrowLeft, X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Keeps a native <dialog> open as a modal while `open` is true. showModal() provides the
 * backdrop, focus trap, Escape to close, inert background and focus returning to the opener.
 */
function useModalDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return ref;
}

const closeButtonClasses = "rounded-control p-1.5 text-body transition-colors hover:bg-card hover:text-heading";

/** modals.md: a centred dialog, for short confirmations. */
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
  const ref = useModalDialog(open);
  const titleId = useId();

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
        <button type="button" onClick={onClose} aria-label="Close" className={closeButtonClasses}>
          <X className="size-5" aria-hidden />
        </button>
      </div>
      {open && children}
    </dialog>
  );
}

/**
 * A modal dialog docked to the right edge at full height, so the page stays visible beside it;
 * at phone width it covers the screen. Its backdrop is lighter than Modal's and not blurred, so
 * the page behind can still be read.
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
  const ref = useModalDialog(open);
  const titleId = useId();

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-none border-line bg-surface-white p-0 text-body shadow-2xl backdrop:bg-black/30 sm:w-[36rem] sm:rounded-l-card sm:border-l"
    >
      <div className="flex h-full flex-col">
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
            <h2 id={titleId} className="m-0 text-xl font-bold leading-[1.25] text-heading">
              {title}
            </h2>
            {subtitle && <p className="m-0 mt-1 text-sm leading-5 text-body">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className={closeButtonClasses}>
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{open && children}</div>
      </div>
    </dialog>
  );
}
