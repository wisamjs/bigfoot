import Link from "next/link";
import { Footer } from "@/components/landing/footer";
import { Container, Wordmark } from "@/components/ui";

/** Legal pages (Privacy Policy, Terms): a plain header, a reading column and the site footer. */
export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-line bg-surface">
        <Container className="flex h-[72px] items-center justify-between gap-4">
          <Link href="/" aria-label="Bigfoot home" className="rounded-control">
            <Wordmark />
          </Link>
          <Link
            href="/"
            className="rounded-control text-base font-medium text-heading transition-colors hover:text-body"
          >
            Back to Bigfoot
          </Link>
        </Container>
      </header>
      <main id="main" className="py-8 md:py-12 lg:py-16">
        <Container>
          <div className="mx-auto max-w-[768px]">{children}</div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
