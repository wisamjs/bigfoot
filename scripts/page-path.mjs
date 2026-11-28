// The URL path of a page entry in scripts/pages.mjs. A dynamic route's entry gives what fills its
// `[param]` segments: `params` as they are, or `application`, the company of one of the Applications
// from scripts/dev-applications.mjs (and `interview`, the title of one of its Interviews), looked up
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
 * Whether opening `page` needs scripts/dev-applications.mjs's data: an Application, or the test
 * Share link (`shareLink`, its label), whose id is made fresh each run.
 */
export function needsData(page) {
  return Boolean(page.application || page.shareLink);
}

/**
 * The path to open `page` as `jobSeekerId`, with its `query` if it has one.
 */
export async function pagePath(page, jobSeekerId) {
  const path = await routePath(page, jobSeekerId);
  return page.query ? `${path}?${page.query}` : path;
}

/**
 * The route's path for `page` as `jobSeekerId`, who holds the Applications when `page.application` is
 * set. `page.interview` is the title of one of that Application's Interviews, for `[interviewId]`.
 * `page.shareLink` is the label of one of their Share links, for `/journey/[id]`.
 */
async function routePath(page, jobSeekerId) {
  if (page.shareLink) {
    const links = await call(jobSeekerId, "GET", "/me/share-links");
    const link = links.find((l) => l.label === page.shareLink);
    if (!link) throw new Error(`${page.path}: no ${page.shareLink} Share link for ${jobSeekerId}`);
    return fillParams(page.path, { id: link.id });
  }
  if (!page.application) return fillParams(page.path, page.params);
  const applications = await call(jobSeekerId, "GET", "/applications");
  const found = applications.find((a) => a.company === page.application);
  if (!found) throw new Error(`${page.path}: no ${page.application} Application for ${jobSeekerId}`);
  if (!page.interview) return fillParams(page.path, { id: found.id });
  const interview = found.interviews.find((i) => i.title === page.interview);
  if (!interview) throw new Error(`${page.path}: no ${page.interview} Interview on ${page.application}`);
  return fillParams(page.path, { id: found.id, interviewId: interview.id });
}
