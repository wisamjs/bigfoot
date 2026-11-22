import { Button } from "@/components/ui/button";
import { SaveStatus } from "@/components/ui/save-status";
import type { SaveTracker } from "@/hooks/use-save-status";

/** The Application page's details form's Save details button, and its save status. */
export function DetailsFormActions({
  changed,
  tracker,
}: {
  /** Whether any detail differs from what's saved; Save details needs one. */
  changed: boolean;
  tracker: SaveTracker;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <SaveStatus status={tracker.status} label="Details" onRetry={tracker.retry} />
      <Button type="submit" disabled={!changed} aria-disabled={tracker.saving || undefined}>
        Save details
      </Button>
    </div>
  );
}
