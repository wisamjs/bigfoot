"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

// Replaces the root layout when it, or a page without its own error boundary, throws while
// rendering in the browser. Reports the error to Sentry (BIG-14). Branded error pages are BIG-19.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-dvh font-sans">
        <main id="main" className="mx-auto max-w-prose p-6">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2">We&rsquo;ve been told about it. Reload the page to try again.</p>
        </main>
      </body>
    </html>
  );
}
