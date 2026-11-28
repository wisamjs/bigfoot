import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountMenu } from "@/features/shell/account-menu";
import { ThemeToggle } from "@/features/shell/theme-toggle";
import { Wordmark } from "@/features/shell/wordmark";
import type { CurrentUser } from "@/lib/dal";

// Account is reached from the avatar's menu, not the nav (BIG-195). The Dashboard is reached from
// Bigfoot's link, at every width, not a pill (BIG-252): a phone has no room for two pills beside the
// dark mode toggle and the avatar, and the header looks the same everywhere.
const links = [{ href: "/applications", label: "Applications" }] as const;

/** The signed-in pages the header can mark current: the Dashboard (Bigfoot's link) and each pill's. */
type CurrentPage = "/dashboard" | (typeof links)[number]["href"];

/**
 * Header for signed-in pages (BIG-173): Bigfoot and the wordmark (the link to the Dashboard), the
 * other signed-in pages as pills (Applications), the light and dark mode toggle, and the job seeker's
 * avatar, which opens the Account menu with Sign out. `current` marks the page's link: a pill
 * highlighted, or Bigfoot's link on the Dashboard, for screen readers. Without a user (a page's
 * loading state) it is the same header with a shape where the avatar goes. A page not in the nav
 * (Account) leaves `current` out and marks nothing.
 */
export function AppHeader({ user, current }: { user?: CurrentUser; current?: CurrentPage }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-card">
      <Container className="flex h-[72px] items-center gap-2 sm:gap-8">
        <Link
          href="/dashboard"
          aria-label="Bigfoot dashboard"
          aria-current={current === "/dashboard" ? "page" : undefined}
          className="touch-target rounded-control"
        >
          <Wordmark compact mark="bigfoot" />
        </Link>
        <nav aria-label="Signed in" className="min-w-0 flex-1">
          <ul className="m-0 flex list-none items-center gap-1 p-0">
            {links.map((link) => (
              <li key={link.href}>
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
