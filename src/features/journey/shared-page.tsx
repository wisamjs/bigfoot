import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { JourneyView } from "@/features/journey/journey-view";
import { LinkGone } from "@/features/journey/link-gone";
import { PasscodeForm } from "@/features/journey/passcode-form";
import { ShareLinkFrame } from "@/features/journey/share-link-frame";
import type { SharedPage as Page } from "@/lib/viewer";

/**
 * A Share link's page (/journey/[id], GLOSSARY.md, docs/adr/0008) for what the route found out
 * about link `id`: the Journey when the Viewer's cookie still opens it; otherwise the Passcode page,
 * or why the link no longer opens. The Pages/Journey stories pass each `page` (BIG-203).
 */
export function SharedPage({ id, page }: { id: string; page: Page }) {
  switch (page.kind) {
    case "journey":
      return <JourneyView id={id} journey={page.journey} />;
    case "passcode":
      return <PasscodeForm id={id} sharedBy={page.sharedBy} locked={page.locked} />;
    case "expired":
      return <LinkGone kind="expired" sharedBy={page.sharedBy} />;
    case "not_active":
      return <LinkGone kind="not_active" />;
  }
}

/** While the route asks the API which page the link shows. */
export function SharedPageSkeleton() {
  return (
    <ShareLinkFrame>
      <LoadingRegion label="Opening the link…">
        <div aria-hidden className="flex flex-col items-center gap-4">
          <Skeleton className="size-[72px] rounded-full" />
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </LoadingRegion>
    </ShareLinkFrame>
  );
}
