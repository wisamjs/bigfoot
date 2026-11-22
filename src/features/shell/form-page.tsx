import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { AppFooter } from "@/features/shell/app-footer";

/**
 * A signed-in page that holds one form, such as Add Application: the header, a "← Dashboard"
 * link, the page's heading, and the form in a card. Without `children` it is the page's loading
 * state, which mustn't hold a form that would throw away what was typed.
 */
export function FormPage({ header, title, children }: { header: ReactNode; title: string; children?: ReactNode }) {
  return (
    <>
      {header}
      <main id="main" className="py-12">
        <Container>
          <div className="mx-auto flex max-w-[768px] flex-col gap-6">
            <Link
              href="/dashboard"
              className="inline-flex w-fit items-center gap-1.5 rounded-control text-sm font-medium text-body transition-colors hover:text-heading"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Dashboard
            </Link>
            <h1 className="m-0 text-[32px] font-bold leading-[1.1] text-heading md:text-[40px]">{title}</h1>
            <div className="card p-6">{children}</div>
          </div>
        </Container>
      </main>
      <AppFooter />
    </>
  );
}
