import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { AppFooter } from "@/features/shell/app-footer";
import { DashboardBackLink } from "@/features/shell/dashboard-link";

/**
 * A signed-in page that holds one form or one record, such as Add Application or an Application's
 * own page: the header, a "← Dashboard" link (back to the calendar view the job seeker left), the
 * page's heading (with a `subtitle` and a `badge` under it), and the content in a card. Without
 * `children` it is the page's loading state, which mustn't hold a form that would throw away what
 * was typed.
 */
export function FormPage({
  header,
  title,
  subtitle,
  badge,
  children,
}: {
  header: ReactNode;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      {header}
      <main id="main" className="py-12">
        <Container>
          <div className="mx-auto flex max-w-[768px] flex-col gap-6">
            <DashboardBackLink />
            <div>
              <h1 className="m-0 text-[32px] font-bold leading-[1.1] text-heading md:text-[40px]">{title}</h1>
              {Boolean(subtitle || badge) && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {subtitle && <p className="m-0 text-base leading-[1.7] text-body">{subtitle}</p>}
                  {badge}
                </div>
              )}
            </div>
            <div className="card p-6">{children}</div>
          </div>
        </Container>
      </main>
      <AppFooter />
    </>
  );
}
