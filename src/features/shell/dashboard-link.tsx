"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

// The dashboard's last view (its calendar's month and picked day, as a search string), kept for
// this tab only. A convenience: without it, "← Dashboard" opens this month.
const KEY = "bigfoot:dashboard-view";

/** Remembers the dashboard's view, `?month=…&day=…` or "" for the default, for "← Dashboard". */
export function rememberDashboardView(search: string) {
  try {
    sessionStorage.setItem(KEY, search);
  } catch {
    // Storage blocked (a private window, site data off): "← Dashboard" opens this month.
  }
}

function rememberedView(): string {
  try {
    const search = sessionStorage.getItem(KEY) ?? "";
    // Only ever a search string this tab wrote; anything else is ignored.
    return search.startsWith("?") ? search : "";
  } catch {
    return "";
  }
}

// The view changes only on the dashboard, never while this link is on screen.
const subscribe = () => () => {};

/**
 * "← Dashboard", back to the view the job seeker left: the month and day its calendar showed
 * (rememberDashboardView). The server renders the plain link; the browser adds the view.
 */
export function DashboardBackLink() {
  const search = useSyncExternalStore(subscribe, rememberedView, () => "");
  return (
    <Link
      href={`/dashboard${search}`}
      className="touch-target inline-flex w-fit items-center gap-1.5 rounded-control text-sm font-medium text-body transition-colors hover:text-heading"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Dashboard
    </Link>
  );
}
