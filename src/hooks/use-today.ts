"use client";

import { useState } from "react";
import { useIsClient } from "@/hooks/use-is-client";

/**
 * Now, as the viewer's browser sees it, read once when the component mounts; null on the server
 * and before hydration, which can't know the viewer's time zone. For "in 2 days" and the like.
 */
export function useToday(): Date | null {
  // Read only in the browser: a static page (the landing page) is rendered ahead of time, which can't read the clock.
  const [now] = useState(() =>
    typeof window === "undefined" ? null : new Date(),
  );
  return useIsClient() ? now : null;
}
