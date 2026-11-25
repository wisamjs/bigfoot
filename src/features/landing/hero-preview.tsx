"use client";

import { useMemo } from "react";
import { ApplicationList } from "@/features/applications/application-list";
import { useToday } from "@/hooks/use-today";
import { previewApplications } from "@/lib/mock-data";

/**
 * The landing page is rendered ahead of time, without the clock, so until hydration any fixed day will do: the
 * list shows no relative dates until then.
 */
const SERVER_DAY = new Date("2026-11-20T12:00:00Z");

/**
 * The landing page's picture of the Applications list, its sample Interviews dated from the
 * visitor's today, not from when the page was rendered.
 */
export function HeroPreview() {
  const today = useToday();
  const applications = useMemo(
    () => previewApplications(today ?? SERVER_DAY),
    [today],
  );
  return <ApplicationList decorative applications={applications} />;
}
