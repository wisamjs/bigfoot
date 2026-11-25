"use client";

import { ApplicationList } from "@/features/applications/application-list";
import { previewApplications } from "@/lib/mock-data";

/**
 * The landing page's picture of the Applications list. A client component, so the sample
 * Interviews are dated from the visitor's today, not from when the page was rendered.
 */
export function HeroPreview() {
  return <ApplicationList decorative applications={previewApplications} />;
}
