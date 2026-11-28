// Strings that try to run script when shown or followed: raw tags, an event handler that breaks
// out of an attribute, and URLs whose scheme runs code. Tests type them into forms and render
// them in every display, then check they show as text and never become elements or links.

export const XSS_TEXT = [
  "<script>window.__xss = true</script>",
  '<img src=x onerror="window.__xss = true">',
  '"><svg onload="window.__xss = true">',
  "'); window.__xss = true; //",
  "<iframe src=\"javascript:window.__xss = true\"></iframe>",
] as const;

/* eslint-disable no-script-url -- these are the attacks the tests check are refused. */
export const XSS_URLS = [
  "javascript:window.__xss = true",
  "JaVaScRiPt:window.__xss = true",
  " javascript:window.__xss = true",
  "data:text/html,<script>window.__xss = true</script>",
  "vbscript:alert(1)",
] as const;
/* eslint-enable no-script-url */

/**
 * Elements a payload would create if it were parsed as HTML instead of shown as text. Bigfoot's own
 * illustrations are images with an empty alt (the Outcome card's, BIG-227); an injected one has none.
 */
export const INJECTED_ELEMENTS = 'script, img:not([alt=""]), svg[onload], iframe, [onerror], [onload]';
