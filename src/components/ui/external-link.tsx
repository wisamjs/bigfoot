import type { AnchorHTMLAttributes } from "react";

const SAFE_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * `url` when it is an absolute http or https URL, otherwise null. Every `href` built from what
 * someone typed goes through this, so a `javascript:` or `data:` link can never be clicked.
 */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    return SAFE_PROTOCOLS.has(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

type ExternalLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel"> & {
  /** A URL someone typed; the link isn't shown unless it is http or https. */
  href: string | null | undefined;
};

/**
 * A link to someone else's site, opened in a new tab without access to this one (`noopener`)
 * and without telling it where the visitor came from (`noreferrer`). Renders nothing when the
 * URL isn't safe to follow.
 */
export function ExternalLink({ href, children, ...props }: ExternalLinkProps) {
  const safe = safeHref(href);
  if (!safe) return null;
  return (
    <a {...props} href={safe} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
