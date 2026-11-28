"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { rememberView } from "@/features/shell/back-links";
import { viewSearch } from "@/features/shell/view-params";

/**
 * The dashboard's view, kept in its URL so Back from another page and a shared link show the same
 * view: the calendar's month (`2026-12`), picked day (`2026-12-04`) and, on a phone, whether "Show
 * month" swapped this week's row for the month grid (`calendar=month`). The Applications list's
 * sort moved to its own page (BIG-252), so a `sort` here is ignored.
 */
export const MONTH_PARAM = "month";
export const DAY_PARAM = "day";
export const SHOW_MONTH_PARAM = "calendar";

const VIEW_PARAMS = [MONTH_PARAM, DAY_PARAM, SHOW_MONTH_PARAM];

/**
 * The dashboard's search params, remembered for "← Dashboard" on the other pages each time they
 * change (rememberView).
 */
export function useDashboardView(): URLSearchParams {
  const params = useSearchParams();
  const search = viewSearch(new URLSearchParams(params.toString()), VIEW_PARAMS);
  useEffect(() => rememberView("dashboard", search), [search]);
  return params;
}
