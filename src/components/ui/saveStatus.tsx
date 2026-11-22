import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import { cn } from "cn";
import type { SaveStatus as Status } from "@/hooks/useSaveStatus";

/**
 * A save's status, beside the field or button that started it: a spinner and "Saving…", then a
 * check and "Saved" that fades out, or the error with a Retry. Screen readers hear the first two
 * politely and the error at once, each prefixed with `label` ("Interview 2 kind: Saved").
 * The live region is always rendered, so the first status is announced too.
 */
export function SaveStatus({
  status,
  label,
  onRetry,
  savingText = "Saving…",
  savedText = "Saved",
  className,
}: {
  status: Status;
  /** Names what is saving, for screen readers. */
  label: string;
  onRetry?: () => void;
  savingText?: string;
  savedText?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 flex-wrap items-center text-xs leading-4", className)}>
      <output aria-live="polite" className="inline-flex items-center gap-1 text-body">
        {status.phase === "saving" && (
          <>
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
            <span className="sr-only">{label}: </span>
            {savingText}
          </>
        )}
        {status.phase === "saved" && (
          // Keyed by run, so a second save restarts the fade. Held, then faded over the end of
          // SAVED_FOR_MS; with reduced motion it just goes.
          <span
            key={status.run}
            className="inline-flex items-center gap-1 text-fg-success-strong animate-out fade-out fill-mode-forwards duration-400 delay-1600"
          >
            <Check className="size-3.5" aria-hidden />
            <span className="sr-only">{label}: </span>
            {savedText}
          </span>
        )}
      </output>
      {status.phase === "failed" && (
        <span role="alert" className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-fg-danger">
          <span className="inline-flex items-start gap-1">
            <CircleAlert className="size-3.5 shrink-0" aria-hidden />
            <span>
              <span className="sr-only">{label}: </span>
              {status.error}
            </span>
          </span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              aria-label={`Retry, ${label}`}
              className="cursor-pointer rounded-control font-medium underline underline-offset-2 hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Retry
            </button>
          )}
        </span>
      )}
    </span>
  );
}
