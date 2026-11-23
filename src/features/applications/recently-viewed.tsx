"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { applicationHref } from "@/features/applications/routes";

// The Applications opened last in this browser, newest first: their ids only, never their text.
// A convenience for the "Application not found" page; without storage it lists nothing.
const KEY = "bigfoot:recent-applications";
const LIMIT = 5;

function readIds(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string").slice(0, LIMIT) : [];
  } catch {
    return [];
  }
}

/** Puts an Application first among the recently viewed, once its page is open. */
export function RememberViewed({ id }: { id: string }) {
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify([id, ...readIds().filter((other) => other !== id)].slice(0, LIMIT)));
    } catch {
      // Storage blocked (a private window, site data off): nothing is remembered.
    }
  }, [id]);
  return null;
}

/** What the list needs of each of the job seeker's Applications. */
export type ViewedApplication = { id: string; company: string; title: string };

// Read once per render of the list; the ids only change on another page.
const subscribe = () => () => {};
const EMPTY = "[]";

/**
 * "Recently viewed" on the Application not found page (BIG-174): the Applications this browser
 * opened last that still exist among `applications`, newest first, each a link to its page. Nothing
 * when there are none, and nothing on the server, which can't see this browser's storage.
 */
export function RecentlyViewed({ applications }: { applications: ViewedApplication[] }) {
  // A string snapshot, so React compares it by value.
  const ids: string[] = JSON.parse(useSyncExternalStore(subscribe, () => JSON.stringify(readIds()), () => EMPTY));
  const byId = new Map(applications.map((app) => [app.id, app]));
  const viewed = ids.flatMap((id) => byId.get(id) ?? []);
  if (viewed.length === 0) return null;
  return (
    <section aria-labelledby="recently-viewed-title" className="w-full max-w-[720px] text-left">
      <h2 id="recently-viewed-title" className="m-0 text-sm font-bold uppercase tracking-[0.08em] text-body">
        Recently viewed
      </h2>
      <ul aria-labelledby="recently-viewed-title" className="card m-0 mt-3 list-none overflow-hidden p-0">
        {viewed.map((app) => (
          <li key={app.id} className="border-t border-line first:border-t-0">
            <Link
              href={applicationHref(app.id)}
              className="flex min-h-14 items-center gap-3 px-5 py-4 transition-colors hover:bg-card-strong focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
            >
              <span className="min-w-0 flex-1 break-words">
                <span className="font-bold text-heading">{app.company}</span>
                <span className="text-body"> · {app.title}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-body" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
