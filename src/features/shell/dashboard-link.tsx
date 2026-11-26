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

export function rememberedView(): string {
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

/** "← <page>": the link over a page's heading, back to the page it belongs to. */
export function BackLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="touch-target inline-flex w-fit items-center gap-1.5 rounded-control text-sm font-medium text-body transition-colors hover:text-heading"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {children}
    </Link>
  );
}

/**
 * "← Dashboard", back to the view the job seeker left: the month and day its calendar showed
 * (rememberDashboardView). The server renders the plain link; the browser adds the view.
 */
export function DashboardBackLink() {
  const search = useSyncExternalStore(subscribe, rememberedView, () => "");
  return <BackLink href={`/dashboard${search}`}>Dashboard</BackLink>;
}

/**
 * "Dashboard / <page>", over the heading of a page two steps from the dashboard, such as an
 * Interview page under its Application (BIG-202): both links in the brand colour, Dashboard back to
 * the view the job seeker left, as DashboardBackLink does.
 */
export function DashboardBreadcrumb({ href, children }: { href: string; children: string }) {
  const search = useSyncExternalStore(subscribe, rememberedView, () => "");
  const link =
    "touch-target inline-flex items-center rounded-control font-medium text-fg-brand transition-colors hover:text-fg-brand-strong";
  return (
    <nav aria-label="Breadcrumb">
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-1.5 p-0 text-base">
        <li>
          <Link href={`/dashboard${search}`} className={link}>
            Dashboard
          </Link>
        </li>
        <li className="flex items-center gap-x-1.5">
          <span aria-hidden className="text-body">
            /
          </span>
          <Link href={href} className={link}>
            {children}
          </Link>
        </li>
      </ol>
    </nav>
  );
}
