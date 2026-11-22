import Image from "next/image";
import Link from "next/link";
import { SignOutButton } from "@/features/auth/auth-button";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { Wordmark } from "@/features/shell/wordmark";
import type { CurrentUser } from "@/lib/dal";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/account", label: "Account" },
] as const;

/**
 * Header for signed-in pages: who is signed in, the signed-in pages, and Sign out. Without a
 * user (a page's loading state) it is the same header with shapes where the job seeker goes.
 */
export function AppHeader({ user, current }: { user?: CurrentUser; current: (typeof links)[number]["href"] }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/80 backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-surface">
      <Container className="flex h-[72px] items-center justify-between gap-2 sm:gap-4">
        <Link href="/" aria-label="Bigfoot home" className="touch-target rounded-control">
          <Wordmark compact />
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden items-center gap-2.5 md:flex">
            {user ? <Avatar user={user} /> : <Skeleton className="size-8 rounded-full" />}
            <div className="leading-tight">
              <p className="m-0 text-sm font-medium text-heading">
                {user ? user.name : <Skeleton className="inline-block h-3.5 w-28 align-middle" />}
              </p>
              <p className="m-0 text-xs text-body">
                {user ? user.email : <Skeleton className="inline-block h-3 w-40 align-middle" />}
              </p>
            </div>
          </div>
          <nav aria-label="Signed in">
            <ul className="m-0 flex list-none items-center gap-1 p-0 sm:gap-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={link.href === current ? "page" : undefined}
                    className="touch-target rounded-control px-2 py-2 text-sm sm:px-3 font-medium text-body transition-colors hover:text-heading aria-[current=page]:text-heading aria-[current=page]:underline aria-[current=page]:underline-offset-4"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <SignOutButton />
        </div>
      </Container>
    </header>
  );
}

/** avatars.md: base size 32px, circular, cover fit; initials when Google has no photo. */
export function Avatar({ user }: { user: CurrentUser }) {
  if (user.image) {
    return (
      <Image
        src={user.image}
        alt=""
        width={32}
        height={32}
        className="size-8 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="grid size-8 place-items-center rounded-full bg-brand-soft text-xs font-medium text-fg-brand-strong"
    >
      {user.firstName.slice(0, 1).toUpperCase()}
    </span>
  );
}
