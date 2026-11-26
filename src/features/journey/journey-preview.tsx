import { JourneyView } from "@/features/journey/journey-view";
import { PreviewBanner } from "@/features/journey/preview-banner";
import type { Journey } from "@/lib/journey";

/**
 * The job seeker's preview of their Journey (/account/journey-preview, BIG-198): the page a Viewer
 * sees, under a banner back to the Account page, with no Lock. The API leaves `shared_by` out of a
 * preview, so it is `sharedBy`, the name a new Share link would carry. `now` is for stories.
 */
export function JourneyPreview({ journey, sharedBy, now }: { journey: Journey; sharedBy: string; now?: Date }) {
  return <JourneyView journey={{ ...journey, shared_by: sharedBy }} banner={<PreviewBanner />} now={now} />;
}
