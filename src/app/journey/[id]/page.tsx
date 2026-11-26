import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { LinkGone } from "@/features/journey/link-gone";
import { PasscodeForm } from "@/features/journey/passcode-form";
import { ShareLinkFrame } from "@/features/journey/share-link-frame";
import { JourneyView } from "@/features/journey/journey-view";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { sharedPage, VIEWER_COOKIE } from "@/lib/viewer";

// Not behind Google sign-in (src/proxy.ts doesn't match /journey/*). next.config.ts also sends
// Referrer-Policy: no-referrer and X-Robots-Tag, so the link's id never leaks to another site.
export const metadata: Metadata = {
  title: "Shared Journey · Bigfoot",
  robots: { index: false, follow: false },
};

/**
 * A Share link (GLOSSARY.md, docs/adr/0008): the Journey when the Viewer's cookie still opens it;
 * otherwise the Passcode page, or why the link no longer opens.
 */
export default function SharedPage({ params }: PageProps<"/journey/[id]">) {
  return (
    <Suspense fallback={<SharedPageSkeleton />}>
      <Shared params={params} />
    </Suspense>
  );
}

async function Shared({ params }: Pick<PageProps<"/journey/[id]">, "params">) {
  const [{ id }, jar] = await Promise.all([params, cookies()]);
  const page = await sharedPage(id, jar.get(VIEWER_COOKIE)?.value);
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

function SharedPageSkeleton() {
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
