import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { toCurrentUser } from "@/lib/current-user";
import { NEXT_PARAM, safeNext, signInHref } from "@/lib/safe-next";

/** Pages for signed-out visitors: a signed-in job seeker skips them. */
const SIGNED_OUT_PAGES = new Set(["/", "/sign-in", "/sign-up"]);

/**
 * Redirects with HTTP, before anything renders. A signed-in job seeker goes from the landing page,
 * /sign-in and /sign-up to /dashboard, or to /sign-in's `next` when it is a path on Bigfoot. A
 * signed-out visitor opening a signed-in page goes to /sign-in, with `next` set to that page, so
 * signing in lands back on it. An optimistic check: it only decrypts the session cookie, and
 * Auth.js treats an expired or invalid one as no session. The Data Access Layer (src/lib/dal.ts)
 * stays the real check for every signed-in page and Server Action. A Share link's pages (`/journey/*`)
 * aren't matched: a Viewer has no account, and the link and its Passcode are what open it.
 */
export const proxy = auth((request) => {
  // POSTs are Server Actions (the Google button, saves); each checks the session itself.
  if (request.method !== "GET") return;
  const signedIn = toCurrentUser(request.auth) !== null;
  const { pathname, search } = request.nextUrl;
  if (SIGNED_OUT_PAGES.has(pathname)) {
    if (!signedIn) return;
    const next = pathname === "/sign-in" ? request.nextUrl.searchParams.get(NEXT_PARAM) : null;
    return redirectTo(safeNext(next), request);
  }
  if (!signedIn) return redirectTo(signInHref(`${pathname}${search}`), request);
});

function redirectTo(path: string, request: NextRequest) {
  return NextResponse.redirect(new URL(path, request.nextUrl));
}

export const config = {
  matcher: ["/", "/sign-in", "/sign-up", "/dashboard", "/applications/:path*", "/interviews/:path*", "/account", "/account/journey-preview"],
};
