import { Link2Off, TimerOff } from "lucide-react";
import { ShareLinkFrame } from "@/features/journey/share-link-frame";
import { PeekOverBigfoot } from "@/features/shell/illustrations";
import { viewerCopy } from "@/lib/journey";

/**
 * A Share link that no longer opens (BIG-197). A stopped link and an id that was never a link both
 * say "This link isn't active" and name nobody, so the page gives nothing away. An expired link
 * names the job seeker, who can renew it. Bigfoot looks over the card's top edge, right of the
 * wordmark (BIG-229); on a phone he would reach the wordmark, so he shows from `sm` up.
 */
export function LinkGone({ kind, sharedBy = null }: { kind: "not_active" | "expired"; sharedBy?: string | null }) {
  const expired = kind === "expired";
  const Icon = expired ? TimerOff : Link2Off;
  return (
    <ShareLinkFrame
      art={
        // Paws resting on the card's top edge, the rest of him above it, in the gap under the wordmark.
        <PeekOverBigfoot className="pointer-events-none absolute bottom-[calc(100%-4px)] right-2.5 hidden h-auto w-34 sm:block" />
      }
    >
      <span className="grid size-16 place-items-center rounded-full bg-card-strong text-body">
        <Icon className="size-7" aria-hidden />
      </span>
      <h1 className="m-0 mt-5 text-[28px] font-bold leading-[1.15] text-heading">
        {expired ? "This link has expired" : "This link isn’t active"}
      </h1>
      <p className="m-0 mt-3 text-base leading-[1.7] text-body">
        {expired ? viewerCopy(sharedBy).expired : "Ask the person who sent it for a new one."}
      </p>
    </ShareLinkFrame>
  );
}
