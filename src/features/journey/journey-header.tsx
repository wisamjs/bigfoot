import { Eye, Lock } from "lucide-react";
import { lockAction } from "@/app/journey/[id]/actions";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ThemeToggle } from "@/features/shell/theme-toggle";
import { Wordmark } from "@/features/shell/wordmark";

/**
 * The Journey's header (BIG-197): Bigfoot, "View only", who shared it, the light and dark mode toggle, and Lock, which forgets the
 * Viewer's cookie and goes back to the Passcode page. On a phone, "View only · shared by …" moves to
 * a band under the bar. The job seeker's own preview (BIG-198) has no link `id`, so no Lock.
 */
export function JourneyHeader({ id, sharedBy }: { id?: string; sharedBy: string | null }) {
  const sharedByText = sharedBy ? `Shared by ${sharedBy}` : null;
  return (
    <header className="border-b border-line bg-card">
      <Container className="flex h-[72px] items-center gap-3 sm:gap-4">
        <Wordmark mark="tile" />
        <span className="hidden items-center gap-1.5 rounded-full bg-card-strong px-3 py-1 text-sm font-medium text-heading sm:inline-flex">
          <Eye className="size-4" aria-hidden />
          View only
        </span>
        <span className="flex-1" />
        {sharedByText && <span className="hidden text-sm text-body sm:inline">{sharedByText}</span>}
        <ThemeToggle />
        {id && (
          <form action={lockAction.bind(null, id)}>
            <Button type="submit" variant="secondary">
              <Lock className="size-4" aria-hidden />
              Lock
            </Button>
          </form>
        )}
      </Container>
      <p className="m-0 flex items-center gap-2 border-t border-line bg-card-strong px-4 py-2 text-sm font-medium text-heading sm:hidden">
        <Eye className="size-4" aria-hidden />
        View only{sharedBy && ` · shared by ${sharedBy}`}
      </p>
    </header>
  );
}
