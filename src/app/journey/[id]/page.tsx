import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { SharedPage, SharedPageSkeleton } from "@/features/journey/shared-page";
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
export default function Page({ params }: PageProps<"/journey/[id]">) {
  return (
    <Suspense fallback={<SharedPageSkeleton />}>
      <Shared params={params} />
    </Suspense>
  );
}

async function Shared({ params }: Pick<PageProps<"/journey/[id]">, "params">) {
  const [{ id }, jar] = await Promise.all([params, cookies()]);
  return <SharedPage id={id} page={await sharedPage(id, jar.get(VIEWER_COOKIE)?.value)} />;
}
