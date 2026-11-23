/** The Add Application page. */
export const ADD_APPLICATION_HREF = "/applications/new";

/** The search param that chooses the Add Interview page's Application. */
export const APPLICATION_PARAM = "application";

/** The Add Interview page, with an Application already chosen when `applicationId` is given. */
export function addInterviewHref(applicationId?: string) {
  if (!applicationId) return "/interviews/new";
  return `/interviews/new?${new URLSearchParams({ [APPLICATION_PARAM]: applicationId })}`;
}

/** The search param that marks an Application page opened just after adding it. */
export const ADDED_PARAM = "added";

/** An Application's own page, or with `added`, as it opens just after the Application was added. */
export function applicationHref(id: string, { added = false }: { added?: boolean } = {}) {
  const path = `/applications/${encodeURIComponent(id)}`;
  return added ? `${path}?${ADDED_PARAM}=1` : path;
}

/** An Interview's own page, under its Application's. */
export function interviewHref(applicationId: string, interviewId: string) {
  return `${applicationHref(applicationId)}/interviews/${encodeURIComponent(interviewId)}`;
}

/** The dashboard's search param that says what was just deleted, so it can say so. */
export const DELETED_PARAM = "deleted";

/** The dashboard, as it opens just after an Interview was deleted from its own page. */
export const INTERVIEW_DELETED_HREF = `/dashboard?${DELETED_PARAM}=interview`;
