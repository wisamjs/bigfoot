"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

/**
 * The pages a link can lead back to in the view the job seeker left them in: the dashboard (its
 * calendar's month and picked day) and the Applications list (its Progress filter and sort,
 * BIG-252). Each view is kept as a search string, for this tab only. A convenience: without it, the
 * link opens the page's default view.
 */
export type RememberedPage = "dashboard" | "applications";

const KEYS: Record<RememberedPage, string> = {
  dashboard: "bigfoot:dashboard-view",
  applications: "bigfoot:applications-view",
};

/** Remembers a page's view, `?month=…&day=…` or "" for the default, for the links back to it. */
export function rememberView(page: RememberedPage, search: string) {
  try {
    sessionStorage.setItem(KEYS[page], search);
  } catch {
    // Storage blocked (a private window, site data off): the link opens the default view.
  }
}

export function rememberedView(page: RememberedPage): string {
  try {
    const search = sessionStorage.getItem(KEYS[page]) ?? "";
    // Only ever a search string this tab wrote; anything else is ignored.
    return search.startsWith("?") ? search : "";
  } catch {
    return "";
  }
}

// A view changes only on its own page, never while a link back to it is on screen.
const subscribe = () => () => {};

/** `path` with the view the job seeker left it in. The server renders the plain path; the browser adds the view. */
function useRememberedHref(page: RememberedPage, path: string): string {
  const search = useSyncExternalStore(subscribe, () => rememberedView(page), () => "");
  return `${path}${search}`;
}

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

/** "← Dashboard", back to the view the job seeker left: the month and day its calendar showed. */
export function DashboardBackLink() {
  return <BackLink href={useRememberedHref("dashboard", "/dashboard")}>Dashboard</BackLink>;
}

/** "← Applications", back to the Applications list with the filter and sort it was left with (BIG-252). */
export function ApplicationsBackLink() {
  return <BackLink href={useRememberedHref("applications", "/applications")}>Applications</BackLink>;
}

/**
 * "Applications / <page>", over the heading of a page two steps from the Applications list, such as
 * an Interview page under its Application (BIG-202): both links in the brand colour, Applications
 * back to the filter and sort the job seeker left, as ApplicationsBackLink does.
 */
export function ApplicationsBreadcrumb({ href, children }: { href: string; children: string }) {
  const applications = useRememberedHref("applications", "/applications");
  const link =
    "touch-target inline-flex items-center rounded-control font-medium text-fg-brand transition-colors hover:text-fg-brand-strong";
  return (
    <nav aria-label="Breadcrumb">
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-1.5 p-0 text-base">
        <li>
          <Link href={applications} className={link}>
            Applications
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
