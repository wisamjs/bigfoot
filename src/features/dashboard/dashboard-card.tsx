import type { ReactNode } from "react";

/**
 * One of the dashboard's two cards, Applications and Interviews (BIG-173): a section named by its
 * h2, with the card's controls on the right of the heading and its content below, edge to edge,
 * framed in the brand-tinted --line-brand-subtle border the Next up card shares (BIG-195).
 */
export function DashboardCard({
  id,
  title,
  actions,
  children,
  className = "",
}: {
  id: string;
  title: string;
  actions: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={`card flex min-w-0 flex-col border-line-brand-subtle ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-5 sm:px-6">
        <h2 id={id} className="m-0 text-xl font-bold leading-[1.25] text-heading">
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-4">{actions}</div>
      </div>
      {children}
    </section>
  );
}
