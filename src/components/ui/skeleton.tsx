import type { ReactNode } from "react";

/**
 * A grey shape standing in for content that is still loading (globals.css `.skeleton`). Size it
 * with the classes of the content it replaces. Hidden from assistive tech: the surrounding
 * LoadingRegion says what is loading.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`skeleton ${className}`} />;
}

/**
 * Wraps a loading state: one busy region that tells screen readers what is loading. Text that
 * doesn't wait on data (headings, nav) stays real inside it; only data gets Skeleton shapes.
 */
export function LoadingRegion({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div aria-busy="true">
      <output className="sr-only">{label}</output>
      {children}
    </div>
  );
}
