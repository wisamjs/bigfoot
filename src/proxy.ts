import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { toCurrentUser } from "@/lib/current-user";

/**
 * Sends a signed-in job seeker from the landing page, /sign-in and /sign-up to /dashboard with
 * an HTTP redirect, before anything renders. An optimistic check: it only decrypts the session
 * cookie, and Auth.js treats an expired or invalid one as no session. The Data Access Layer
 * (src/lib/dal.ts) stays the real check for every signed-in page and Server Action.
 */
export const proxy = auth((request) => {
  // POSTs here are the Google button's Server Action; let them through.
  if (request.method !== "GET" || !toCurrentUser(request.auth)) return;
  return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
});

export const config = {
  matcher: ["/", "/sign-in", "/sign-up"],
};
