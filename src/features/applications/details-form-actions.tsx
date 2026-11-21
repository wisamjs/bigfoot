import { Button } from "@/components/ui/button";
import { SaveStatus } from "@/components/ui/save-status";
import type { SaveTracker } from "@/hooks/use-save-status";

/**
 * The details form's buttons and save status: Save details when editing an Application, or
 * Cancel and Add application when creating one.
 */
export function DetailsFormActions({
  creating,
  changed,
  tracker,
  onCancel,
}: {
  creating: boolean;
  /** Whether any detail differs from what's saved; Save details needs one. */
  changed: boolean;
  tracker: SaveTracker;
  onCancel?: () => void;
}) {
  if (!creating) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-3">
        <SaveStatus status={tracker.status} label="Details" onRetry={tracker.retry} />
        <Button type="submit" disabled={!changed} aria-disabled={tracker.saving || undefined}>
          Save details
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
      {/* No "Saved": the panel closes once the Application is added. */}
      <SaveStatus
        status={tracker.status.phase === "saved" ? { phase: "idle" } : tracker.status}
        label="New Application"
        savingText="Adding…"
        onRetry={tracker.retry}
      />
      <Button onClick={onCancel} variant="secondary">
        Cancel
      </Button>
      <Button type="submit" aria-disabled={tracker.saving || undefined}>
        Add application
      </Button>
    </div>
  );
}
