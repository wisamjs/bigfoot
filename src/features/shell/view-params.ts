/**
 * Sets (or, for null, removes) each search param of the page's URL, keeping the others: a page's
 * view kept in its URL, such as the dashboard's month or the Applications list's filter. Next.js
 * folds these history calls into its router, so useSearchParams follows them. `push` adds a history
 * entry, so Back returns to the view before; by default the entry is replaced.
 */
export function setViewParams(values: Record<string, string | null>, { push = false }: { push?: boolean } = {}) {
  const next = new URLSearchParams(window.location.search);
  for (const [name, value] of Object.entries(values)) {
    if (value) next.set(name, value);
    else next.delete(name);
  }
  const query = next.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
  if (push) window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
}

/** The view's params in `params` as a search string, "" for the default view. */
export function viewSearch(params: URLSearchParams, names: readonly string[]): string {
  const view = new URLSearchParams();
  for (const name of names) {
    const value = params.get(name);
    if (value) view.set(name, value);
  }
  const search = view.toString();
  return search ? `?${search}` : "";
}
