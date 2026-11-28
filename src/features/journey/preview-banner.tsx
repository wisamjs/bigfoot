import { ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/container";

/**
 * Above the job seeker's own preview of their Journey (BIG-198): what this page is, and the way
 * back to the Account page.
 */
export function PreviewBanner() {
  return (
    <aside aria-label="Preview" className="border-b border-line-brand-subtle bg-brand-softer text-sm text-fg-brand-strong">
      <Container className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 max-sm:px-4">
        <p className="m-0 flex items-center gap-2 font-medium">
          <Eye className="size-4 shrink-0" aria-hidden />
          This is what your Viewers see.
        </p>
        <Link
          href="/account"
          className="touch-target inline-flex items-center gap-1.5 rounded-control font-medium underline underline-offset-4 hover:no-underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Account
        </Link>
      </Container>
    </aside>
  );
}
