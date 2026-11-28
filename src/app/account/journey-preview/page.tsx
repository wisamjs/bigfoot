import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { JourneySkeleton } from "@/features/journey/journey-view";
import { JourneyPreview } from "@/features/journey/journey-preview";
import { previewJourney } from "@/lib/api";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Preview your Journey · Bigfoot",
  robots: { index: false, follow: false },
};

/**
 * The job seeker's own Journey as their Viewers see it (BIG-198), with no Passcode and no Share
 * link needed. Behind Google sign-in (src/proxy.ts); opening it marks no link as opened.
 */
export default function Page() {
  return (
    <Suspense fallback={<JourneySkeleton />}>
      <Preview />
    </Suspense>
  );
}

async function Preview() {
  const user = await getCurrentUser();
  // The Journey is read fresh and laid out around today, so it renders at request time, never in a prefetch.
  await connection();
  return <JourneyPreview journey={await previewJourney(user.id)} sharedBy={user.name} />;
}
