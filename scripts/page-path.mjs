// The URL path of a page entry in scripts/pages.mjs. A dynamic route's entry gives what fills its
// `[param]` segments: `params` as they are, or `application`, the company of one of the Applications
// from scripts/dev-applications.mjs (and `interview`, the kind of one of its Interviews), looked up
// for the job seeker who will open the page.
import { call } from "./dev-applications.mjs";

/** `path` with each `[name]` segment replaced by `params[name]`. */
export function fillParams(path, params = {}) {
  return path.replace(/\[(\w+)\]/g, (_, name) => {
    if (!(name in params)) throw new Error(`${path} needs a "${name}" param in scripts/pages.mjs`);
    return encodeURIComponent(params[name]);
  });
}

/**
 * The path to open `page` as `jobSeekerId`, who holds the Applications when `page.application` is
 * set. `page.interview` is the kind of one of that Application's Interviews, for `[interviewId]`.
 */
export async function pagePath(page, jobSeekerId) {
  if (!page.application) return fillParams(page.path, page.params);
  const applications = await call(jobSeekerId, "GET", "/applications");
  const found = applications.find((a) => a.company === page.application);
  if (!found) throw new Error(`${page.path}: no ${page.application} Application for ${jobSeekerId}`);
  if (!page.interview) return fillParams(page.path, { id: found.id });
  const interview = found.interviews.find((i) => i.kind === page.interview);
  if (!interview) throw new Error(`${page.path}: no ${page.interview} Interview on ${page.application}`);
  return fillParams(page.path, { id: found.id, interviewId: interview.id });
}
