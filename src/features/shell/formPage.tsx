import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { AppFooter } from "@/features/shell/appFooter";

/**
 * A signed-in page that holds one form or one record, such as Add Application or an Application's
 * own page: the header, a "← Dashboard" link, the page's heading (with a `subtitle` under it), and
 * the content in a card. Without `children` it is the page's loading state, which mustn't hold a
 * form that would throw away what was typed.
 */
export function FormPage({
  header,
  title,
  subtitle,
  children,
}: {
  header: ReactNode;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <>
      {header}
      <main id="main" className="py-12">
        <Container>
          <div className="mx-auto flex max-w-[768px] flex-col gap-6">
            <Link
              href="/dashboard"
              className="touch-target inline-flex w-fit items-center gap-1.5 rounded-control text-sm font-medium text-body transition-colors hover:text-heading"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Dashboard
            </Link>
            <div>
              <h1 className="m-0 text-[32px] font-bold leading-[1.1] text-heading md:text-[40px]">{title}</h1>
              {subtitle && <p className="m-0 mt-2 text-base leading-[1.7] text-body">{subtitle}</p>}
            </div>
            <div className="card p-6">{children}</div>
          </div>
        </Container>
      </main>
      <AppFooter />
    </>
  );
}
