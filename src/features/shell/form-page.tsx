import type { ComponentType, ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { AppFooter } from "@/features/shell/app-footer";
import { DashboardBackLink } from "@/features/shell/dashboard-link";

/**
 * A signed-in page that holds one form or one record, such as Add Application or an Application's
 * own page: the header, a "← Dashboard" link (back to the calendar view the job seeker left), the
 * page's heading (with a `subtitle` and a `badge` under it), and the content in a card. Without
 * `children` it is the page's loading state, which mustn't hold a form that would throw away what
 * was typed.
 * A `back` link replaces "← Dashboard", for a page that belongs to another, such as an Interview
 * page to its Application page. A `notice` (a status line such as "Interview deleted") sits over
 * the heading.
 * A `heading` replaces the title, subtitle and badge, for a page that edits them in place. A
 * `guard` (UnsavedChanges) wraps the heading and the content together, so leaving with something
 * typed in either asks first; the page passes it, as shell code can't import from a feature.
 */
export function FormPage({
  header,
  title,
  subtitle,
  badge,
  heading,
  back,
  notice,
  guard: Guard,
  children,
}: {
  header: ReactNode;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  heading?: ReactNode;
  back?: ReactNode;
  notice?: ReactNode;
  guard?: ComponentType<{ children: ReactNode }>;
  children?: ReactNode;
}) {
  const column = (
    <>
      {back ?? <DashboardBackLink />}
      {notice}
      {heading ?? (
        <div>
          <h1 className="m-0 text-[32px] font-bold leading-[1.1] text-heading md:text-[40px]">{title}</h1>
          {Boolean(subtitle || badge) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {subtitle && <p className="m-0 text-base leading-[1.7] text-body">{subtitle}</p>}
              {badge}
            </div>
          )}
        </div>
      )}
      <div className="card p-6">{children}</div>
    </>
  );
  return (
    <>
      {header}
      <main id="main" className="py-12">
        <Container>
          <div className="mx-auto flex max-w-[768px] flex-col gap-6">
            {Guard ? <Guard>{column}</Guard> : column}
          </div>
        </Container>
      </main>
      <AppFooter />
    </>
  );
}
