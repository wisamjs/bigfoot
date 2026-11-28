"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { signOutAction } from "@/app/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/features/shell/avatar";
import { PrefetchRoutes } from "@/features/shell/prefetch-routes";
import type { CurrentUser } from "@/lib/dal";

/**
 * The header's avatar, which opens a menu (dropdown.md, "With Header"): who is signed in, Account,
 * and Sign out (BIG-173). The menu opens inside the header, so its items are in the banner landmark.
 */
// The Account page's one link is inside this menu, so no <Link> prefetches it until the menu opens.
// Prefetched with every signed-in page instead, Account shows at once from its kept reads (BIG-205).
const ACCOUNT_HREFS = ["/account"];

export function AccountMenu({ user }: { user: CurrentUser }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [signingOut, startSignOut] = useTransition();

  return (
    <div ref={setContainer} className="relative shrink-0">
      <PrefetchRoutes hrefs={ACCOUNT_HREFS} />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          className="grid size-11 cursor-pointer place-items-center rounded-full transition-shadow hover:ring-2 hover:ring-line-brand-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand data-[state=open]:ring-2 data-[state=open]:ring-line-brand"
        >
          {/* The name comes from this text alone: the initials are hidden, so they don't read as "A M". */}
          <span className="sr-only">Account menu, {user.name}</span>
          <Avatar user={user} size="md" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" container={container} className="w-64 max-w-[calc(100vw-2rem)]">
          <DropdownMenuLabel className="px-2 py-2">
            <span className="block break-words text-sm font-semibold text-heading">{user.name}</span>
            <span className="block break-words text-sm font-normal text-body">{user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/account">
              <UserRound aria-hidden />
              Account
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={signingOut} onSelect={() => startSignOut(() => signOutAction())}>
            <LogOut aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
