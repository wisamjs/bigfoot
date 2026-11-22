import { Button } from "@/components/ui/button";
import { SaveStatus } from "@/components/ui/save-status";
import type { SaveTracker } from "@/hooks/use-save-status";

/**
 * The foot of an Add page's form: its save status and its submit button. There's no Cancel: the
 * page's back link leaves it. And no "Saved": the page goes back to the dashboard once it's added.
 */
export function AddFormActions({
  tracker,
  label,
  submitText,
}: {
  tracker: SaveTracker;
  /** What is being added, for the save status, such as "New Interview". */
  label: string;
  submitText: string;
}) {
  return (
    // On a phone the footer sticks to the bottom of the screen, so the button is in reach however long
    // the form is (docs/guidelines/mobile.md).
    <div className="sticky bottom-0 z-30 mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface py-3 max-md:-mx-6 max-md:px-6 md:static md:bg-transparent md:pb-0 md:pt-4">
      <SaveStatus
        status={tracker.status.phase === "saved" ? { phase: "idle" } : tracker.status}
        label={label}
        savingText="Adding…"
        onRetry={tracker.retry}
      />
      <Button type="submit" aria-disabled={tracker.saving || undefined}>
        {submitText}
      </Button>
    </div>
  );
}
