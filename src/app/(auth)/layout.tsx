import Link from "next/link";
import { Container, Wordmark } from "@/components/ui";

/** Sign in and sign up: a plain header and one centred card on the hero's atmosphere. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
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
      <main id="main" className="hero-atmosphere py-16 md:py-24">
        <Container>{children}</Container>
      </main>
    </>
  );
}
