"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { rememberDashboardView } from "@/features/shell/dashboard-link";

/**
 * The dashboard's view, kept in its URL so Back from another page and a shared link show the same
 * view: the calendar's month (`2026-12`), picked day (`2026-12-04`) and, on a phone, whether "Show
 * month" swapped this week's row for the month grid (`calendar=month`); and the Applications list's
 * sort (`sort=location`, BIG-209).
 */
export const MONTH_PARAM = "month";
export const DAY_PARAM = "day";
export const SHOW_MONTH_PARAM = "calendar";
export const SORT_PARAM = "sort";

const VIEW_PARAMS = [MONTH_PARAM, DAY_PARAM, SHOW_MONTH_PARAM, SORT_PARAM];

/** The view's params in the URL as a search string, "" for the default view. */
export function viewSearch(params: URLSearchParams): string {
  const view = new URLSearchParams();
  for (const name of VIEW_PARAMS) {
    const value = params.get(name);
    if (value) view.set(name, value);
  }
  const search = view.toString();
  return search ? `?${search}` : "";
}

/**
 * The dashboard's search params, remembered for "← Dashboard" on the other pages each time they
 * change (rememberDashboardView).
 */
export function useDashboardView(): URLSearchParams {
  const params = useSearchParams();
  const search = viewSearch(new URLSearchParams(params.toString()));
  useEffect(() => rememberDashboardView(search), [search]);
  return params;
}

/** Sets (or, for null, removes) each param, replacing the history entry rather than adding one. */
export function setViewParams(values: Record<string, string | null>) {
  const next = new URLSearchParams(window.location.search);
  for (const [name, value] of Object.entries(values)) {
    if (value) next.set(name, value);
    else next.delete(name);
  }
  const query = next.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}
