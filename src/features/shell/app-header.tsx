import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountMenu } from "@/features/shell/account-menu";
import { ThemeToggle } from "@/features/shell/theme-toggle";
import { Wordmark } from "@/features/shell/wordmark";
import type { CurrentUser } from "@/lib/dal";

// Account is reached from the avatar's menu, not the nav (BIG-195). On a phone there is no room for
// both pills beside the dark mode toggle and the avatar, so Dashboard gives way to Bigfoot, whose
// link leads there too (BIG-252).
const links = [
  { href: "/dashboard", label: "Dashboard", className: "max-sm:hidden" },
  { href: "/applications", label: "Applications", className: "" },
] as const;

/**
 * Header for signed-in pages (BIG-173): Bigfoot and the wordmark (a link to the Dashboard), the signed-in pages as pills (Applications only, on a phone), the light and dark mode toggle,
 * and the job seeker's avatar, which opens the Account menu with Sign out. Without a user (a page's loading
 * state) it is the same header with a shape where the avatar goes. A page not in the nav (Account)
 * leaves `current` out and highlights nothing.
 */
export function AppHeader({ user, current }: { user?: CurrentUser; current?: (typeof links)[number]["href"] }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-card">
      <Container className="flex h-[72px] items-center gap-2 sm:gap-8">
        <Link href="/dashboard" aria-label="Bigfoot dashboard" className="touch-target rounded-control">
          <Wordmark compact mark="bigfoot" />
        </Link>
        <nav aria-label="Signed in" className="min-w-0 flex-1">
          <ul className="m-0 flex list-none items-center gap-1 p-0">
            {links.map((link) => (
              <li key={link.href} className={link.className}>
                <Link
                  href={link.href}
                  aria-current={link.href === current ? "page" : undefined}
                  className="touch-target rounded-control px-2.5 py-2.5 font-medium sm:px-3.5 text-body transition-colors hover:bg-card-strong hover:text-heading aria-[current=page]:bg-card-strong aria-[current=page]:font-semibold aria-[current=page]:text-heading"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <ThemeToggle />
        {user ? <AccountMenu user={user} /> : <Skeleton className="size-10 rounded-full" />}
      </Container>
    </header>
  );
}
