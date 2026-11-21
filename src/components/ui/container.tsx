import type { ReactNode } from "react";

/** layout.md: max-width 1152px, centred, 24px horizontal padding. */
export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1152px] px-6 ${className}`}>{children}</div>;
}
