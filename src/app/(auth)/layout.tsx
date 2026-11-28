import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ThemeToggle } from "@/features/shell/theme-toggle";
import { Wordmark } from "@/features/shell/wordmark";

/** Sign in and sign up: a plain header and one centred card on the hero's atmosphere. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
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
      <main id="main" className="hero-atmosphere py-16 md:py-24">
        <Container>{children}</Container>
      </main>
    </>
  );
}
