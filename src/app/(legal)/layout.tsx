import Link from "next/link";
import { Footer } from "@/features/landing/footer";
import { Container } from "@/components/ui/container";
import { ThemeToggle } from "@/features/shell/theme-toggle";
import { Wordmark } from "@/features/shell/wordmark";

/** Legal pages (Privacy Policy, Terms): a plain header, a reading column and the site footer. */
export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-line bg-surface">
        <Container className="flex h-[72px] items-center justify-between gap-4">
          <Link href="/" aria-label="Bigfoot home" className="touch-target rounded-control">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <Link
              href="/"
              className="touch-target whitespace-nowrap rounded-control text-base font-medium text-heading transition-colors hover:text-body"
            >
              Back to Bigfoot
            </Link>
          </div>
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
