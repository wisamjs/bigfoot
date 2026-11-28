"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { rememberView } from "@/features/shell/back-links";
import { setViewParams, viewSearch } from "@/features/shell/view-params";
import { parseApplicationSort, parseProgressFilter, type ApplicationSort, type ProgressFilter } from "@/lib/applications";

/**
 * The Applications list's view (BIG-252), kept in its URL: the Progress filter (`progress=waiting`)
 * and the sort (`sort=next`, BIG-209). All and the Progress sort leave no param, and an unknown value
 * reads as the default. A shared link opens the same view, and each change is remembered for the
 * "Applications" link back from an Application page.
 */
export const PROGRESS_PARAM = "progress";
export const SORT_PARAM = "sort";

const VIEW_PARAMS = [PROGRESS_PARAM, SORT_PARAM];

export type ApplicationsView = {
  progress: ProgressFilter;
  sort: ApplicationSort;
  /** Picks a filter, keeping the sort. Each pick is a history entry, so Back and Forward step through them. */
  setProgress: (progress: ProgressFilter) => void;
  /** Picks a sort, keeping the filter, in place of the current history entry. */
  setSort: (sort: ApplicationSort) => void;
};

export function useApplicationsView(): ApplicationsView {
  const params = useSearchParams();
  const search = viewSearch(new URLSearchParams(params.toString()), VIEW_PARAMS);
  useEffect(() => rememberView("applications", search), [search]);
  return {
    progress: parseProgressFilter(params.get(PROGRESS_PARAM)),
    sort: parseApplicationSort(params.get(SORT_PARAM)),
    setProgress: (progress) => setViewParams({ [PROGRESS_PARAM]: progress === "all" ? null : progress }, { push: true }),
    setSort: (sort) => setViewParams({ [SORT_PARAM]: sort === "progress" ? null : sort }),
  };
}
