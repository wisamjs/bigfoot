/** The Add Application page. */
export const ADD_APPLICATION_HREF = "/applications/new";

/** The search param that chooses the Add Interview page's Application. */
export const APPLICATION_PARAM = "application";

/** The Add Interview page, with an Application already chosen when `applicationId` is given. */
export function addInterviewHref(applicationId?: string) {
  if (!applicationId) return "/interviews/new";
  return `/interviews/new?${new URLSearchParams({ [APPLICATION_PARAM]: applicationId })}`;
}
